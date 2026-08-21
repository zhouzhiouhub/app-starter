import type { Prisma } from "@prisma/client";
import type { PrismaService } from "../../prisma/prisma.service.js";
import {
  matchesPublishedPageContext,
  type PublishedPageContext,
} from "../pages.public-context.js";
import { getPublicSite } from "../pages.site.js";
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

export async function listPublishedPages(
  prisma: PrismaService,
  context: PublishedPageContext,
  requestId = "local-dev",
) {
  const site = await getPublicSite(prisma, context.siteHost);

  if (!site) {
    return {
      data: [],
      meta: {
        requestId,
        tenantId: null,
        siteId: null,
        total: 0,
      },
    };
  }

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

  const summaries = pages.flatMap((page) =>
    toPublishedPageSummary(page, context),
  );

  return {
    data: summaries,
    meta: {
      requestId,
      tenantId: site.tenantId,
      siteId: site.id,
      total: summaries.length,
    },
  };
}

function toPublishedPageSummary(
  page: PublishedPageRecord,
  context: PublishedPageContext,
) {
  const publishedVersion = page.versions.find(
    (version) => version.id === page.publishedVersionId,
  );

  if (!publishedVersion) {
    return [];
  }

  const schema = readSchema(publishedVersion.schema, page.slug);
  if (!matchesPublishedPageContext(schema, context)) {
    return [];
  }

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
