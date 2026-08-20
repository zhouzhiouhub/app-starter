import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { apiErrorCodes, type PageSchema } from "@app-starter/schema";
import { runTenantIdempotent } from "../../common/idempotency-record.js";
import type { Actor } from "../identity/identity.types.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { MEDIA_MAX_UPLOAD_BYTES } from "./media.constants.js";
import {
  createMediaR2Key,
  inferMediaAssetType,
  toMediaAssetResponse,
} from "./media.mapper.js";
import { readArchivedAt, writeArchiveMetadata } from "./media.metadata.js";
import { assertSchemaMediaReferencesPublishable } from "./media.publish-validation.js";
import type { MediaUploadUrlResponse } from "./media.types.js";
import {
  createMediaCdnUrl,
  createMediaUploadTarget,
} from "./media.upload-target.js";
import { findMediaUsage } from "./media.usage.js";
import {
  assertAllowedExternalMediaUrl,
  assertTenantR2Key,
  parseConfirmMediaInput,
  parseCreateUploadUrlInput,
} from "./media.validation.js";
import { listMediaAssets } from "./use-cases/list-media-assets.js";
import { resolveSchemaMediaReferences } from "./use-cases/resolve-schema-media-references.js";

@Injectable()
export class MediaService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    query: {
      page?: string | number;
      limit?: string | number;
      status?: string;
      type?: string;
    },
    actor: Actor,
    requestId = "local-dev",
  ) {
    return listMediaAssets(this.prisma, query, actor, requestId);
  }

  createUploadUrl(
    body: unknown,
    idempotencyKey: string | undefined,
    actor: Actor,
    requestId = "local-dev",
  ) {
    const input = parseCreateUploadUrlInput(body);

    return runTenantIdempotent(this.prisma, {
      body: input,
      key: idempotencyKey,
      scope: "media:upload-url",
      tenantId: actor.tenantId,
      operation: () => {
        const r2Key = createMediaR2Key({
          filename: input.filename,
          tenantId: actor.tenantId,
        });
        const uploadTarget = createMediaUploadTarget({
          mimeType: input.mimeType,
          r2Key,
        });

        return Promise.resolve({
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
            requestId,
            tenantId: actor.tenantId,
          },
        });
      },
    });
  }

  async confirm(
    body: unknown,
    idempotencyKey: string | undefined,
    actor: Actor,
    requestId = "local-dev",
  ) {
    const input = parseConfirmMediaInput(body);
    assertTenantR2Key(input.r2Key, actor.tenantId);
    if (input.url) {
      assertAllowedExternalMediaUrl(input.url);
    }

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
          return this.assetResponse(existing, actor.tenantId, requestId);
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

        return this.assetResponse(asset, actor.tenantId, requestId);
      },
    });
  }

  async resolveSchemaMediaReferences(
    schema: PageSchema,
    tenantId: string,
  ): Promise<PageSchema> {
    return resolveSchemaMediaReferences(this.prisma, schema, tenantId);
  }

  async assertSchemaMediaReferencesPublishable(
    schema: PageSchema,
    tenantId: string,
    client: Pick<Prisma.TransactionClient, "mediaAsset"> = this.prisma,
  ): Promise<void> {
    await assertSchemaMediaReferencesPublishable(client, schema, tenantId);
  }

  async archive(
    id: string,
    actor: Actor,
    idempotencyKey: string | undefined,
    requestId = "local-dev",
  ) {
    return runTenantIdempotent(this.prisma, {
      body: { id },
      key: idempotencyKey,
      scope: `media:${id}:archive`,
      tenantId: actor.tenantId,
      operation: () => this.archiveAsset(id, actor, requestId),
    });
  }

  private async archiveAsset(id: string, actor: Actor, requestId: string) {
    const asset = await this.prisma.mediaAsset.findFirst({
      where: {
        id,
        tenantId: actor.tenantId,
      },
    });

    if (!asset) {
      throw new NotFoundException({
        code: apiErrorCodes.NOT_FOUND,
        message: "Media asset was not found.",
      });
    }

    if (readArchivedAt(asset.metadata)) {
      return this.assetResponse(asset, actor.tenantId, requestId);
    }

    const usage = await findMediaUsage(this.prisma, {
      mediaAssetId: asset.id,
      tenantId: actor.tenantId,
    });

    if (usage.length > 0) {
      throw new ConflictException({
        code: apiErrorCodes.CONFLICT,
        message: "Media asset is still referenced by page versions.",
        details: {
          usage: usage.slice(0, 10),
        },
      });
    }

    const archived = await this.prisma.mediaAsset.update({
      where: { id: asset.id },
      data: {
        metadata: writeArchiveMetadata({
          actorId: actor.id,
          metadata: asset.metadata,
        }),
      },
    });

    return this.assetResponse(archived, actor.tenantId, requestId);
  }

  private assetResponse(
    asset: Parameters<typeof toMediaAssetResponse>[0],
    tenantId: string,
    requestId = "local-dev",
  ) {
    return {
      data: toMediaAssetResponse(asset),
      meta: {
        requestId,
        tenantId,
      },
    };
  }
}
