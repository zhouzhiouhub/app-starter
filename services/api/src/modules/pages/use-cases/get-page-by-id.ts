import type { Actor } from "../../identity/identity.types.js";
import type { PrismaService } from "../../prisma/prisma.service.js";
import { toPageSummary } from "../pages.mapper.js";
import { getSiteForTenant } from "../pages.site.js";
import { notFound, readSchema } from "../pages.validation.js";

export async function getPageById(
  prisma: PrismaService,
  id: string,
  actor: Actor,
) {
  const site = await getSiteForTenant(prisma, actor.tenantId);
  const page = await prisma.page.findFirst({
    where: { id, siteId: site.id },
    include: {
      versions: {
        orderBy: { version: "desc" },
      },
    },
  });

  if (!page) {
    throw notFound("Page not found.");
  }

  const latest = page.versions[0] ?? null;
  const published = page.publishedVersionId
    ? (page.versions.find(
        (version) => version.id === page.publishedVersionId,
      ) ?? null)
    : null;

  return {
    data: {
      ...toPageSummary(page),
      draftSchema: latest ? readSchema(latest.schema, page.slug) : null,
      publishedSchema: published
        ? readSchema(published.schema, page.slug)
        : null,
      versions: page.versions.map((version) => ({
        id: version.id,
        version: version.version,
        status: version.status,
        publishedAt: version.publishedAt?.toISOString() ?? null,
        createdAt: version.createdAt.toISOString(),
      })),
    },
    meta: {
      requestId: "local-dev",
      tenantId: site.tenantId,
      siteId: site.id,
    },
  };
}
