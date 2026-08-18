import type { PageSchema } from "@app-starter/schema";
import type { Actor } from "../../identity/identity.types.js";
import type { PrismaService } from "../../prisma/prisma.service.js";
import { runIdempotent } from "../pages.idempotency.js";
import { getSiteForTenant } from "../pages.site.js";
import { notFound, parseSchema, readSchema } from "../pages.validation.js";
import { persistPublishedVersion } from "../pages.versions.js";

export async function publishPage(
  prisma: PrismaService,
  id: string,
  body: unknown | undefined,
  idempotencyKey: string | undefined,
  actor: Actor,
) {
  const site = await getSiteForTenant(prisma, actor.tenantId);

  return runIdempotent(prisma, {
    body: body ?? {},
    key: idempotencyKey,
    scope: `pages:${id}:publish`,
    site,
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

        return parsed;
      });

      return {
        data: schema,
        meta: {
          requestId: "local-dev",
          tenantId: site.tenantId,
          siteId: site.id,
          market: schema.meta.market,
          locale: schema.meta.locale,
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
