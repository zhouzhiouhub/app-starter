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
type PublishedPageSummaryRecord = ReturnType<
  typeof toPublishedPageSummary
>[number];

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

  const summaries = await readPublishedPageSummaries(
    prisma,
    site.id,
    context,
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

async function readPublishedPageSummaries(
  prisma: PrismaService,
  siteId: string,
  context: PublishedPageContext,
) {
  const summaries: PublishedPageSummaryRecord[] = [];
  let skip = 0;

  while (summaries.length < publicPublishedPageListMaxCount) {
    const pages = await readPublishedPageRecords(prisma, siteId, skip);

    if (pages.length === 0) {
      return summaries;
    }

    const versionsByPageAndId = await readPublishedVersionsByPageAndId(
      prisma,
      pages,
    );

    summaries.push(
      ...pages.flatMap((page) =>
        toPublishedPageSummary(page, context, versionsByPageAndId),
      ),
    );

    if (pages.length < publicPublishedPageListMaxCount) {
      return summaries.slice(0, publicPublishedPageListMaxCount);
    }

    skip += pages.length;
  }

  return summaries.slice(0, publicPublishedPageListMaxCount);
}

async function readPublishedPageRecords(
  prisma: PrismaService,
  siteId: string,
  skip: number,
): Promise<PublishedPageRecord[]> {
  return prisma.page.findMany({
    where: {
      siteId,
      publishedVersionId: { not: null },
    },
    orderBy: {
      slug: "asc",
    },
    skip,
    take: publicPublishedPageListMaxCount,
    select: {
      id: true,
      publishedVersionId: true,
      slug: true,
    },
  });
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
