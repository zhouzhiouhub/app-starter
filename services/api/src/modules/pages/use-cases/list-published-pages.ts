import type { Prisma } from "@prisma/client";
import type { PrismaService } from "../../prisma/prisma.service.js";
import { getPublicDefaultSite } from "../pages.site.js";
import { readSchema } from "../pages.validation.js";

type PublishedPageRecord = {
  publishedVersionId: string | null;
  slug: string;
  title: string;
  updatedAt: Date;
  versions: Array<{
    id: string;
    publishedAt: Date | null;
    schema: Prisma.JsonValue;
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
          schema: true,
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

  const schema = readSchema(publishedVersion.schema, page.slug);

  return [
    {
      noIndex: schema.seo.noIndex,
      slug: page.slug,
      title: page.title,
      publishedAt: publishedVersion.publishedAt?.toISOString() ?? null,
      updatedAt: page.updatedAt.toISOString(),
    },
  ];
}
