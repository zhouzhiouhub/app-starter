import type { PrismaService } from "../../prisma/prisma.service.js";
import { getPublicDefaultSite } from "../pages.site.js";

type PublishedPageRecord = {
  publishedVersionId: string | null;
  slug: string;
  title: string;
  updatedAt: Date;
  versions: Array<{
    id: string;
    publishedAt: Date | null;
  }>;
};

export async function listPublishedPages(prisma: PrismaService) {
  const site = await getPublicDefaultSite(prisma);
  const pages = await prisma.page.findMany({
    where: {
      siteId: site.id,
      publishedVersionId: { not: null },
    },
    orderBy: {
      slug: "asc",
    },
    select: {
      publishedVersionId: true,
      slug: true,
      title: true,
      updatedAt: true,
      versions: {
        select: {
          id: true,
          publishedAt: true,
        },
      },
    },
  });

  const summaries = pages.flatMap(toPublishedPageSummary);

  return {
    data: summaries,
    meta: {
      requestId: "local-dev",
      tenantId: site.tenantId,
      siteId: site.id,
      total: summaries.length,
    },
  };
}

function toPublishedPageSummary(page: PublishedPageRecord) {
  const publishedVersion = page.versions.find(
    (version) => version.id === page.publishedVersionId,
  );

  if (!publishedVersion) {
    return [];
  }

  return [
    {
      slug: page.slug,
      title: page.title,
      publishedAt: publishedVersion.publishedAt?.toISOString() ?? null,
      updatedAt: page.updatedAt.toISOString(),
    },
  ];
}
