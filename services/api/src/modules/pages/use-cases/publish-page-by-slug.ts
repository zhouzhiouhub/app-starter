import type { Actor } from "../../identity/identity.types.js";
import type { PrismaService } from "../../prisma/prisma.service.js";
import { runIdempotent } from "../pages.idempotency.js";
import { resolvePageType } from "../pages.mapper.js";
import { getSiteForTenant } from "../pages.site.js";
import { parseSchema, parseSlug } from "../pages.validation.js";
import { createPage } from "./create-page.js";
import { publishPage } from "./publish-page.js";

type MediaReferenceValidator = Parameters<typeof publishPage>[6];

export async function publishPageBySlug(
  prisma: PrismaService,
  slug: string,
  body: unknown,
  idempotencyKey: string | undefined,
  actor: Actor,
  validateMediaReferences?: MediaReferenceValidator,
  requestId = "local-dev",
) {
  const site = await getSiteForTenant(prisma, actor.tenantId);
  const normalizedSlug = parseSlug(slug);
  const schema = parseSchema(body, normalizedSlug);

  return runIdempotent(prisma, {
    body: schema,
    key: idempotencyKey,
    scope: `admin/pages:${normalizedSlug}:publish`,
    site,
    operation: async () => {
      const page = await prisma.page.findUnique({
        where: {
          siteId_slug: {
            siteId: site.id,
            slug: normalizedSlug,
          },
        },
      });

      if (!page) {
        const created = await createPage(
          prisma,
          {
            slug: normalizedSlug,
            title: schema.meta.title,
            type: resolvePageType(normalizedSlug),
          },
          undefined,
          actor,
          requestId,
        );

        return publishPage(
          prisma,
          created.data.id,
          schema,
          undefined,
          actor,
          undefined,
          validateMediaReferences,
          requestId,
        );
      }

      return publishPage(
        prisma,
        page.id,
        schema,
        undefined,
        actor,
        undefined,
        validateMediaReferences,
        requestId,
      );
    },
  });
}
