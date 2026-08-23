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
  const versionsByPageId = await readSummaryVersionsByPageId(prisma, pages);

  return {
    data: pages.map((page) =>
      toPageSummary(
        {
          ...page,
          versions: versionsByPageId.get(page.id) ?? [],
        },
        site,
      ),
    ),
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

type ListedPage = {
  id: string;
  publishedVersionId: string | null;
};

type SummaryVersion = {
  id: string;
  pageId: string;
  schema: unknown;
};

async function readSummaryVersionsByPageId(
  prisma: PrismaService,
  pages: ListedPage[],
): Promise<Map<string, Array<{ id: string; schema: unknown }>>> {
  if (pages.length === 0) {
    return new Map();
  }

  const latestVersions = await Promise.all(
    pages.map((page) =>
      prisma.pageVersion.findFirst({
        where: { pageId: page.id },
        orderBy: { version: "desc" },
        select: {
          id: true,
          pageId: true,
          schema: true,
        },
      }),
    ),
  );
  const publishedVersionIds = pages.flatMap((page) =>
    page.publishedVersionId ? [page.publishedVersionId] : [],
  );
  const publishedVersions =
    publishedVersionIds.length > 0
      ? await prisma.pageVersion.findMany({
          where: { id: { in: publishedVersionIds } },
          select: {
            id: true,
            pageId: true,
            schema: true,
          },
        })
      : [];
  const existingLatestVersions = latestVersions.flatMap((version) =>
    version
      ? [
          {
            id: version.id,
            pageId: version.pageId,
            schema: version.schema,
          },
        ]
      : [],
  );

  return groupSummaryVersions([
    ...publishedVersions,
    ...existingLatestVersions,
  ]);
}

function groupSummaryVersions(
  versions: SummaryVersion[],
): Map<string, Array<{ id: string; schema: unknown }>> {
  const byPageId = new Map<string, Array<{ id: string; schema: unknown }>>();

  for (const version of versions) {
    const pageVersions = byPageId.get(version.pageId) ?? [];

    if (!pageVersions.some((candidate) => candidate.id === version.id)) {
      pageVersions.push({
        id: version.id,
        schema: version.schema,
      });
      byPageId.set(version.pageId, pageVersions);
    }
  }

  return byPageId;
}
