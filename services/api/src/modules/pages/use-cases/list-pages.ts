import type { Actor } from "../../identity/identity.types.js";
import type { PrismaService } from "../../prisma/prisma.service.js";
import { toPageSummary } from "../pages.mapper.js";
import { getSiteForTenant } from "../pages.site.js";
import { parseListPagesQuery } from "../pages.validation.js";

export async function listPages(
  prisma: PrismaService,
  query: { page?: string | number; limit?: string | number },
  actor: Actor,
  requestId = "local-dev",
) {
  const { page, limit } = parseListPagesQuery(query);
  const site = await getSiteForTenant(prisma, actor.tenantId);
  const skip = (page - 1) * limit;

  const [total, pages] = await prisma.$transaction([
    prisma.page.count({ where: { siteId: site.id } }),
    prisma.page.findMany({
      where: { siteId: site.id },
      orderBy: { updatedAt: "desc" },
      skip,
      take: limit,
    }),
  ]);

  return {
    data: pages.map((page) => toPageSummary(page, site)),
    meta: {
      requestId,
      tenantId: site.tenantId,
      siteId: site.id,
      total,
      page,
      limit,
    },
  };
}
