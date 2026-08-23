import type { PageSchema } from "@app-starter/schema";
import type { Prisma } from "@prisma/client";
import type { Actor } from "../../identity/identity.types.js";
import type { PrismaService } from "../../prisma/prisma.service.js";
import { runIdempotent } from "../pages.idempotency.js";
import { assertPublishablePageImageSources } from "../pages.image-policy.js";
import { assertPageLocaleCanPublish } from "../pages.locale-policy.js";
import {
  createStorefrontRevalidationInput,
  refreshStorefrontRevalidationResponse,
  runStorefrontRevalidationSafely,
  triggerStorefrontRevalidation,
  type StorefrontRevalidator,
} from "../pages.revalidation.js";
import { recordPagePublishedAudit } from "../pages.audit.js";
import { getSiteForTenant } from "../pages.site.js";
import { notFound, parseSchema, readSchema } from "../pages.validation.js";
import { persistPublishedVersion } from "../pages.versions.js";

type MediaReferenceValidator = (
  schema: PageSchema,
  tenantId: string,
  client: Prisma.TransactionClient,
) => Promise<void>;

export async function publishPage(
  prisma: PrismaService,
  id: string,
  body: unknown | undefined,
  idempotencyKey: string | undefined,
  actor: Actor,
  revalidator: StorefrontRevalidator = triggerStorefrontRevalidation,
  validateMediaReferences: MediaReferenceValidator = async () => undefined,
  requestId = "local-dev",
) {
  const site = await getSiteForTenant(prisma, actor.tenantId);

  return runIdempotent(prisma, {
    body: body ?? {},
    key: idempotencyKey,
    scope: `pages:${id}:publish`,
    site,
    replayResponse: (response) =>
      refreshStorefrontRevalidationResponse(response, {
        requestId,
        revalidator,
        siteHost: site.domain,
      }),
    operation: async () => {
      const schema = await prisma.$transaction(async (tx) => {
        const current = await tx.page.findFirst({
          where: { id, siteId: site.id },
          include: {
            versions: {
              orderBy: { version: "desc" },
              take: 1,
            },
          },
        });

        if (!current) {
          throw notFound("Page not found.");
        }

        const latest = current.versions[0];
        const parsed = resolvePublishSchema(body, latest?.schema, current.slug);

        if (!parsed) {
          throw notFound("Page has no schema to publish.");
        }

        assertPageLocaleCanPublish(parsed, requestId);
        assertPublishablePageImageSources(parsed);
        await validateMediaReferences(parsed, site.tenantId, tx);

        const publishedVersion = await persistPublishedVersion(tx, {
          authorId: actor.id,
          latest,
          pageId: current.id,
          schema: parsed,
        });

        await tx.page.update({
          where: { id: current.id },
          data: {
            title: parsed.meta.title,
            status: "published",
            publishedVersionId: publishedVersion.id,
          },
        });

        await recordPagePublishedAudit(tx, {
          actor,
          pageId: current.id,
          publishedVersionId: publishedVersion.id,
          requestId,
          schema: parsed,
          site,
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
            createStorefrontRevalidationInput(
              schema,
              site.domain,
              requestId,
            ),
            revalidator,
          ),
        },
      };
    },
  });
}

function resolvePublishSchema(
  body: unknown | undefined,
  latestSchema: unknown,
  slug: string,
): PageSchema | null {
  if (body) {
    return parseSchema(body, slug);
  }

  return latestSchema ? readSchema(latestSchema, slug) : null;
}
