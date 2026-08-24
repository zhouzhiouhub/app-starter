import type { Prisma } from "@prisma/client";
import { publicPublishedPageListMaxCount } from "@app-starter/schema";
import type { PrismaService } from "../../prisma/prisma.service.js";
import {
  matchesPublishedPageContext,
  type PublishedPageContext,
} from "../pages.public-context.js";
import { readPublicPageSchemaSafely } from "../pages.public-schema.js";
import { getPublicSite } from "../pages.site.js";

type PublishedPageRecord = {
  id: string;
  publishedVersionId: string | null;
  slug: string;
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
        pageLimit: publicPublishedPageListMaxCount,
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
    take: publicPublishedPageListMaxCount,
    select: {
      id: true,
      publishedVersionId: true,
      slug: true,
    },
  });
  const versionsByPageAndId = await readPublishedVersionsByPageAndId(
    prisma,
    pages,
  );

  const summaries = pages.flatMap((page) =>
    toPublishedPageSummary(page, context, versionsByPageAndId),
  );

  return {
    data: summaries,
    meta: {
      requestId,
      tenantId: site.tenantId,
      siteId: site.id,
      total: summaries.length,
      pageLimit: publicPublishedPageListMaxCount,
    },
  };
}

type PublishedVersionRecord = {
  createdAt: Date;
  id: string;
  pageId: string;
  publishedAt: Date | null;
  schema: Prisma.JsonValue;
};

async function readPublishedVersionsByPageAndId(
  prisma: PrismaService,
  pages: PublishedPageRecord[],
): Promise<Map<string, PublishedVersionRecord>> {
  const versionIds = pages.flatMap((page) =>
    page.publishedVersionId ? [page.publishedVersionId] : [],
  );
  const pageIds = pages.map((page) => page.id);

  if (versionIds.length === 0 || pageIds.length === 0) {
    return new Map();
  }

  const versions = await prisma.pageVersion.findMany({
    where: {
      id: { in: versionIds },
      pageId: { in: pageIds },
    },
    select: {
      createdAt: true,
      id: true,
      pageId: true,
      publishedAt: true,
      schema: true,
    },
  });

  return new Map(
    versions.map((version) => [
      createPublishedVersionKey(version.pageId, version.id),
      version,
    ]),
  );
}

function toPublishedPageSummary(
  page: PublishedPageRecord,
  context: PublishedPageContext,
  versionsByPageAndId: Map<string, PublishedVersionRecord>,
) {
  const publishedVersion = page.publishedVersionId
    ? versionsByPageAndId.get(
        createPublishedVersionKey(page.id, page.publishedVersionId),
      )
    : null;

  if (!publishedVersion) {
    return [];
  }

  const schema = readPublicPageSchemaSafely(publishedVersion.schema, page.slug);
  if (!schema) {
    return [];
  }

  if (!matchesPublishedPageContext(schema, context)) {
    return [];
  }

  return [
    {
      noIndex: schema.seo.noIndex,
      slug: page.slug,
      title: schema.meta.title,
      publishedAt: publishedVersion.publishedAt?.toISOString() ?? null,
      updatedAt: readPublishedVersionUpdatedAt(publishedVersion).toISOString(),
    },
  ];
}

function readPublishedVersionUpdatedAt(version: {
  createdAt: Date;
  publishedAt: Date | null;
}): Date {
  return version.publishedAt ?? version.createdAt;
}

function createPublishedVersionKey(pageId: string, versionId: string): string {
  return `${pageId}:${versionId}`;
}
