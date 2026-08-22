import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type { PageSchema } from "@app-starter/schema";
import type { Actor } from "../identity/identity.types.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { assertSchemaMediaReferencesPublishable } from "./media.publish-validation.js";
import { archiveMediaAsset } from "./use-cases/archive-media-asset.js";
import { confirmMediaAsset } from "./use-cases/confirm-media-asset.js";
import { createMediaUploadUrl } from "./use-cases/create-media-upload-url.js";
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
    return createMediaUploadUrl(
      this.prisma,
      body,
      idempotencyKey,
      actor,
      requestId,
    );
  }

  async confirm(
    body: unknown,
    idempotencyKey: string | undefined,
    actor: Actor,
    requestId = "local-dev",
  ) {
    return confirmMediaAsset(
      this.prisma,
      body,
      idempotencyKey,
      actor,
      requestId,
    );
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
    return archiveMediaAsset(
      this.prisma,
      id,
      actor,
      idempotencyKey,
      requestId,
    );
  }
}
