import { BadRequestException } from "@nestjs/common";
import { apiErrorCodes, type PageSchema } from "@app-starter/schema";
import type { Prisma } from "@prisma/client";
import type { Actor } from "../../identity/identity.types.js";
import type { PrismaService } from "../../prisma/prisma.service.js";
import { runIdempotent } from "../pages.idempotency.js";
import { assertPageLocaleCanPublish } from "../pages.locale-policy.js";
import {
  createStorefrontRevalidationInput,
  refreshStorefrontRevalidationResponse,
  runStorefrontRevalidationSafely,
  triggerStorefrontRevalidation,
  type StorefrontRevalidator,
} from "../pages.revalidation.js";
import { recordPageRollbackAudit } from "../pages.audit.js";
import { getSiteForTenant } from "../pages.site.js";
import {
  notFound,
  parseRollbackInput,
  readSchema,
} from "../pages.validation.js";
import { persistRollbackVersion } from "../pages.versions.js";

type MediaReferenceValidator = (
  schema: PageSchema,
  tenantId: string,
  client: Prisma.TransactionClient,
) => Promise<void>;

export async function rollbackPage(
  prisma: PrismaService,
  id: string,
  body: unknown,
  idempotencyKey: string | undefined,
  actor: Actor,
  revalidator: StorefrontRevalidator = triggerStorefrontRevalidation,
  validateMediaReferences: MediaReferenceValidator = async () => undefined,
  requestId = "local-dev",
) {
  const site = await getSiteForTenant(prisma, actor.tenantId);
  const input = parseRollbackInput(body);

  return runIdempotent(prisma, {
    body: input,
    key: idempotencyKey,
    scope: `pages:${id}:rollback`,
    site,
    replayResponse: (response) =>
      refreshStorefrontRevalidationResponse(response, {
        requestId,
        revalidator,
        siteHost: site.domain,
      }),
    operation: async () => {
      const schema = await prisma.$transaction(async (tx) => {
        const page = await tx.page.findFirst({
          where: { id, siteId: site.id },
          include: {
            versions: {
              orderBy: { version: "desc" },
              take: 1,
            },
          },
        });

        if (!page) {
          throw notFound("Page not found.");
        }

        const target = await tx.pageVersion.findFirst({
          where: {
            id: input.versionId,
            pageId: page.id,
          },
        });

        if (!target) {
          throw notFound("Page version not found.");
        }

        if (target.status !== "published") {
          throw new BadRequestException({
            code: apiErrorCodes.VALIDATION_ERROR,
            message: "Only published versions can be rolled back.",
          });
        }

        const parsed = readSchema(target.schema, page.slug);
        assertPageLocaleCanPublish(parsed);
        await validateMediaReferences(parsed, site.tenantId, tx);

        const rollbackVersion = await persistRollbackVersion(tx, {
          authorId: actor.id,
          latest: page.versions[0],
          pageId: page.id,
          target,
        });

        await tx.page.update({
          where: { id: page.id },
          data: {
            publishedVersionId: rollbackVersion.id,
            status: "published",
            title: parsed.meta.title,
          },
        });

        await recordPageRollbackAudit(tx, {
          actor,
          pageId: page.id,
          requestId,
          rollbackVersionId: rollbackVersion.id,
          schema: parsed,
          site,
          targetVersionId: target.id,
        });

        return parsed;
      });

      return {
        data: schema,
        meta: {
          requestId,
          tenantId: site.tenantId,
          siteId: site.id,
          market: schema.meta.market,
          locale: schema.meta.locale,
          revalidation: await runStorefrontRevalidationSafely(
            createStorefrontRevalidationInput(schema, site.domain),
            revalidator,
          ),
        },
      };
    },
  });
}
