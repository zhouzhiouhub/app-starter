import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import {
  collectMediaReferences,
  pageSchema,
  readMediaAssetId,
  resolveMediaReferences,
  type PageSchema,
} from "@app-starter/schema";
import { runTenantIdempotent } from "../../common/idempotency-record.js";
import type { Actor } from "../identity/identity.types.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { MEDIA_MAX_UPLOAD_BYTES } from "./media.constants.js";
import {
  createMediaR2Key,
  inferMediaAssetType,
  toMediaAssetResponse,
} from "./media.mapper.js";
import type { MediaUploadUrlResponse } from "./media.types.js";
import {
  createMediaCdnUrl,
  createMediaUploadTarget,
} from "./media.upload-target.js";
import {
  assertTenantR2Key,
  parseConfirmMediaInput,
  parseCreateUploadUrlInput,
  parseListMediaQuery,
} from "./media.validation.js";

@Injectable()
export class MediaService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    query: { page?: string | number; limit?: string | number; type?: string },
    actor: Actor,
  ) {
    const { page, limit, type } = parseListMediaQuery(query);
    const skip = (page - 1) * limit;
    const where = {
      tenantId: actor.tenantId,
      ...(type ? { type } : {}),
    };

    const [total, assets] = await this.prisma.$transaction([
      this.prisma.mediaAsset.count({ where }),
      this.prisma.mediaAsset.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
    ]);

    return {
      data: assets.map(toMediaAssetResponse),
      meta: {
        requestId: "local-dev",
        tenantId: actor.tenantId,
        total,
        page,
        limit,
      },
    };
  }

  createUploadUrl(body: unknown, actor: Actor) {
    const input = parseCreateUploadUrlInput(body);
    const r2Key = createMediaR2Key({
      filename: input.filename,
      tenantId: actor.tenantId,
    });
    const uploadTarget = createMediaUploadTarget({
      mimeType: input.mimeType,
      r2Key,
    });

    return {
      data: {
        uploadUrl: uploadTarget.uploadUrl,
        method: "PUT",
        r2Key,
        type: inferMediaAssetType(input.mimeType),
        headers: uploadTarget.headers,
        maxSize: MEDIA_MAX_UPLOAD_BYTES,
        expiresAt: uploadTarget.expiresAt.toISOString(),
        confirmPath: "/api/v1/media/confirm",
      } satisfies MediaUploadUrlResponse,
      meta: {
        requestId: "local-dev",
        tenantId: actor.tenantId,
      },
    };
  }

  async confirm(
    body: unknown,
    idempotencyKey: string | undefined,
    actor: Actor,
  ) {
    const input = parseConfirmMediaInput(body);
    assertTenantR2Key(input.r2Key, actor.tenantId);

    return runTenantIdempotent(this.prisma, {
      body: input,
      key: idempotencyKey,
      scope: `media:${input.r2Key}:confirm`,
      tenantId: actor.tenantId,
      operation: async () => {
        const existing = await this.prisma.mediaAsset.findFirst({
          where: {
            r2Key: input.r2Key,
            tenantId: actor.tenantId,
          },
        });

        if (existing) {
          return this.assetResponse(existing, actor.tenantId);
        }

        const asset = await this.prisma.mediaAsset.create({
          data: {
            tenantId: actor.tenantId,
            type: inferMediaAssetType(input.mimeType),
            filename: input.filename,
            url: input.url ?? createMediaCdnUrl(input.r2Key),
            r2Key: input.r2Key,
            size: BigInt(input.size),
            mimeType: input.mimeType,
            metadata: input.metadata as Prisma.InputJsonValue,
          },
        });

        return this.assetResponse(asset, actor.tenantId);
      },
    });
  }

  async resolveSchemaMediaReferences(
    schema: PageSchema,
    tenantId: string,
  ): Promise<PageSchema> {
    const references = collectMediaReferences(schema);

    if (references.length === 0) {
      return schema;
    }

    const ids = references
      .map((reference) => readMediaAssetId(reference))
      .filter((id): id is string => Boolean(id));
    const assets = await this.prisma.mediaAsset.findMany({
      where: {
        id: { in: ids },
        tenantId,
      },
      select: {
        id: true,
        url: true,
      },
    });
    const urlsByReference = new Map(
      assets.map((asset) => [`media://${asset.id}`, asset.url]),
    );

    return pageSchema.parse(
      resolveMediaReferences(
        schema,
        (reference) => urlsByReference.get(reference) ?? reference,
      ),
    );
  }

  private assetResponse(
    asset: Parameters<typeof toMediaAssetResponse>[0],
    tenantId: string,
  ) {
    return {
      data: toMediaAssetResponse(asset),
      meta: {
        requestId: "local-dev",
        tenantId,
      },
    };
  }
}
