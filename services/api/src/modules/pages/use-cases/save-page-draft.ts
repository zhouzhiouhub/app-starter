import type { Actor } from "../../identity/identity.types.js";
import type { PrismaService } from "../../prisma/prisma.service.js";
import { runIdempotent } from "../pages.idempotency.js";
import { nextVersionNumber, toPageSummary } from "../pages.mapper.js";
import { getSiteForTenant } from "../pages.site.js";
import { notFound, parseSchema, toJson } from "../pages.validation.js";

export async function savePageDraft(
  prisma: PrismaService,
  id: string,
  body: unknown,
  idempotencyKey: string | undefined,
  actor: Actor,
  requestId = "local-dev",
) {
  const site = await getSiteForTenant(prisma, actor.tenantId);

  return runIdempotent(prisma, {
    body,
    key: idempotencyKey,
    scope: `pages:${id}:save-draft`,
    site,
    operation: async () => {
      const { page, schema } = await prisma.$transaction(async (tx) => {
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

        const schema = parseSchema(body, current.slug);
        const latest = current.versions[0];

        if (latest && latest.status !== "published") {
          await tx.pageVersion.update({
            where: { id: latest.id },
            data: {
              schema: toJson(schema),
              authorId: actor.id,
            },
          });
        } else {
          await tx.pageVersion.create({
            data: {
              pageId: current.id,
              version: nextVersionNumber(latest?.version),
              schema: toJson(schema),
              status: "draft",
              authorId: actor.id,
            },
          });
        }

        return {
          page: await tx.page.update({
            where: { id: current.id },
            data: {
              title: schema.meta.title,
            },
          }),
          schema,
        };
      });

      return {
        data: toPageSummary(page, site, schema),
        meta: {
          requestId,
          tenantId: site.tenantId,
          siteId: site.id,
        },
      };
    },
  });
}
