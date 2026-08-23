import type { Actor } from "../../identity/identity.types.js";
import type { PrismaService } from "../../prisma/prisma.service.js";
import { toPageSummary } from "../pages.mapper.js";
import { getSiteForTenant } from "../pages.site.js";
import { notFound, readSchema } from "../pages.validation.js";
import {
  loadPageVersionAuthors,
  toPageVersionSummary,
} from "../pages.versions.js";

export async function getPageById(
  prisma: PrismaService,
  id: string,
  actor: Actor,
  requestId = "local-dev",
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

  const authorsById = await loadPageVersionAuthors(prisma, {
    tenantId: site.tenantId,
    versions: page.versions,
  });
  const latest = page.versions[0] ?? null;
  const published = page.publishedVersionId
    ? (page.versions.find(
        (version) => version.id === page.publishedVersionId,
      ) ?? null)
    : null;
  const draftSchema = latest ? readSchema(latest.schema, page.slug) : null;
  const publishedSchema = published
    ? readSchema(published.schema, page.slug)
    : null;

  return {
    data: {
      ...toPageSummary(page, site, draftSchema ?? publishedSchema),
      draftSchema,
      publishedSchema,
      versions: page.versions.map((version) =>
        toPageVersionSummary(version, authorsById.get(version.authorId)),
      ),
    },
    meta: {
      requestId,
      tenantId: site.tenantId,
      siteId: site.id,
    },
  };
}
