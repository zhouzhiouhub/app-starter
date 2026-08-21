import { ServiceUnavailableException } from "@nestjs/common";
import { apiErrorCodes } from "@app-starter/schema";
import type { AuditService } from "../../audit/audit.service.js";
import type { Actor } from "../../identity/identity.types.js";
import type { PrismaService } from "../../prisma/prisma.service.js";
import {
  createPagePreviewToken,
  PreviewTokenConfigurationError,
} from "../pages.preview-token.js";
import { runIdempotent } from "../pages.idempotency.js";
import { getSiteForTenant } from "../pages.site.js";
import { notFound } from "../pages.validation.js";

export async function createPreviewToken(
  prisma: PrismaService,
  audit: Pick<AuditService, "record">,
  id: string,
  idempotencyKey: string | undefined,
  actor: Actor,
  requestId = "local-dev",
) {
  const site = await getSiteForTenant(prisma, actor.tenantId);

  return runIdempotent(prisma, {
    body: {},
    key: idempotencyKey,
    scope: `pages:${id}:preview-token`,
    site,
    storeResponse: false,
    operation: async () => {
      const page = await prisma.page.findFirst({
        where: {
          id,
          siteId: site.id,
        },
        select: {
          id: true,
          slug: true,
        },
      });

      if (!page) {
        throw notFound("Page not found.");
      }

      try {
        const preview = createPagePreviewToken({
          pageId: page.id,
          slug: page.slug,
          tenantId: actor.tenantId,
        });
        const expiresAt = preview.expiresAt.toISOString();

        await audit.record({
          action: "preview_token.created",
          actorId: actor.id,
          metadata: {
            expiresAt,
            siteId: site.id,
            slug: page.slug,
          },
          requestId,
          targetId: page.id,
          targetType: "page",
          tenantId: actor.tenantId,
        });

        return {
          data: {
            expiresAt,
            slug: page.slug,
            token: preview.token,
          },
          meta: {
            requestId,
            tenantId: site.tenantId,
            siteId: site.id,
          },
        };
      } catch (error) {
        if (error instanceof PreviewTokenConfigurationError) {
          throw new ServiceUnavailableException({
            code: apiErrorCodes.INTERNAL_ERROR,
            message: error.message,
          });
        }

        throw error;
      }
    },
  });
}
