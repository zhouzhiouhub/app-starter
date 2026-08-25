import type { Actor } from "../../identity/identity.types.js";
import type { PrismaService } from "../../prisma/prisma.service.js";
import { getSiteForTenant } from "../pages.site.js";
import { notFound, parseListPagesQuery } from "../pages.validation.js";
import {
  loadPageVersionAuthors,
  pageVersionSummarySelect,
  toPageVersionSummary,
} from "../pages.versions.js";

export async function listPageVersions(
  prisma: PrismaService,
  id: string,
  query: { page?: string | number; limit?: string | number },
  actor: Actor,
  requestId = "local-dev",
) {
  const { page, limit } = parseListPagesQuery(query);
  const site = await getSiteForTenant(prisma, actor.tenantId);
  const targetPage = await prisma.page.findFirst({
    where: { id, siteId: site.id },
    select: { id: true },
  });

  if (!targetPage) {
    throw notFound("Page not found.", requestId);
  }

  const skip = (page - 1) * limit;
  const [total, versions] = await prisma.$transaction([
    prisma.pageVersion.count({ where: { pageId: targetPage.id } }),
    prisma.pageVersion.findMany({
      where: { pageId: targetPage.id },
      orderBy: { version: "desc" },
      select: pageVersionSummarySelect,
      skip,
      take: limit,
    }),
  ]);
  const authorsById = await loadPageVersionAuthors(prisma, {
    tenantId: site.tenantId,
    versions,
  });

  return {
    data: versions.map((version) =>
      toPageVersionSummary(version, authorsById.get(version.authorId)),
    ),
    meta: {
      requestId,
      tenantId: site.tenantId,
      siteId: site.id,
      pageId: targetPage.id,
      total,
      page,
      limit,
    },
  };
}
