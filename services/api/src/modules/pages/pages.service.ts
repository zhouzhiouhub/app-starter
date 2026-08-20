import { Injectable } from "@nestjs/common";
import { AuditService } from "../audit/audit.service.js";
import type { Actor } from "../identity/identity.types.js";
import { MediaService } from "../media/media.service.js";
import { PrismaService } from "../prisma/prisma.service.js";
import type { PublishedPageContext } from "./pages.public-context.js";
import { createPage } from "./use-cases/create-page.js";
import { createPreviewToken } from "./use-cases/create-preview-token.js";
import { getPageById } from "./use-cases/get-page-by-id.js";
import { getPreviewPageByToken } from "./use-cases/get-preview-page-by-token.js";
import { getPublishedPageBySlug } from "./use-cases/get-published-page-by-slug.js";
import { listPages } from "./use-cases/list-pages.js";
import { listPublishedPages } from "./use-cases/list-published-pages.js";
import { publishPage } from "./use-cases/publish-page.js";
import { publishPageBySlug } from "./use-cases/publish-page-by-slug.js";
import { rollbackPage } from "./use-cases/rollback-page.js";
import { savePageDraft } from "./use-cases/save-page-draft.js";

@Injectable()
export class PagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly media: MediaService,
    private readonly audit: AuditService,
  ) {}

  async list(
    query: { page?: string | number; limit?: string | number },
    actor: Actor,
    requestId: string,
  ) {
    return listPages(this.prisma, query, actor, requestId);
  }

  async getById(id: string, actor: Actor, requestId: string) {
    return getPageById(this.prisma, id, actor, requestId);
  }

  async createPreviewToken(
    id: string,
    idempotencyKey: string | undefined,
    actor: Actor,
    requestId: string,
  ) {
    return createPreviewToken(
      this.prisma,
      this.audit,
      id,
      idempotencyKey,
      actor,
      requestId,
    );
  }

  async create(
    body: unknown,
    idempotencyKey: string | undefined,
    actor: Actor,
    requestId: string,
  ) {
    return createPage(this.prisma, body, idempotencyKey, actor, requestId);
  }

  async saveDraft(
    id: string,
    body: unknown,
    idempotencyKey: string | undefined,
    actor: Actor,
    requestId: string,
  ) {
    return savePageDraft(this.prisma, id, body, idempotencyKey, actor, requestId);
  }

  async publish(
    id: string,
    body: unknown | undefined,
    idempotencyKey: string | undefined,
    actor: Actor,
    requestId: string,
  ) {
    return publishPage(
      this.prisma,
      id,
      body,
      idempotencyKey,
      actor,
      undefined,
      (schema, tenantId, client) =>
        this.media.assertSchemaMediaReferencesPublishable(
          schema,
          tenantId,
          client,
        ),
      requestId,
    );
  }

  async rollback(
    id: string,
    body: unknown,
    idempotencyKey: string | undefined,
    actor: Actor,
    requestId: string,
  ) {
    return rollbackPage(
      this.prisma,
      id,
      body,
      idempotencyKey,
      actor,
      undefined,
      (schema, tenantId, client) =>
        this.media.assertSchemaMediaReferencesPublishable(
          schema,
          tenantId,
          client,
        ),
      requestId,
    );
  }

  async publishBySlug(
    slug: string,
    body: unknown,
    idempotencyKey: string | undefined,
    actor: Actor,
    requestId: string,
  ) {
    return publishPageBySlug(
      this.prisma,
      slug,
      body,
      idempotencyKey,
      actor,
      (schema, tenantId, client) =>
        this.media.assertSchemaMediaReferencesPublishable(
          schema,
          tenantId,
          client,
        ),
      requestId,
    );
  }

  async getPublishedBySlug(slug: string, context: PublishedPageContext) {
    return getPublishedPageBySlug(this.prisma, slug, context, (
      schema,
      tenantId,
    ) =>
      this.media.resolveSchemaMediaReferences(schema, tenantId),
    );
  }

  async getPreviewByToken(token: string) {
    return getPreviewPageByToken(this.prisma, token, (schema, tenantId) =>
      this.media.resolveSchemaMediaReferences(schema, tenantId),
    );
  }

  async listPublished(context: PublishedPageContext) {
    return listPublishedPages(this.prisma, context);
  }
}
