import type { Actor } from "../../identity/identity.types.js";
import type { Prisma } from "@prisma/client";
import type { PrismaService } from "../../prisma/prisma.service.js";
import { toPageSummary } from "../pages.mapper.js";
import { getSiteForTenant } from "../pages.site.js";
import { notFound, readSchema } from "../pages.validation.js";
import {
  loadPageVersionAuthors,
  pageVersionDetailSelect,
  type PageVersionRecord,
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
        select: pageVersionDetailSelect,
        take: 1,
      },
    },
  });

  if (!page) {
    throw notFound("Page not found.");
  }

  const latest = page.versions[0] ?? null;
  const published = await readPublishedVersion(prisma, {
    latest,
    pageId: page.id,
    publishedVersionId: page.publishedVersionId,
  });
  const versions = collectPageDetailVersions(latest, published);
  const authorsById = await loadPageVersionAuthors(prisma, {
    tenantId: site.tenantId,
    versions,
  });
  const draftSchema = latest ? readSchema(latest.schema, page.slug) : null;
  const publishedSchema = published
    ? readSchema(published.schema, page.slug)
    : null;

  return {
    data: {
      ...toPageSummary(
        { ...page, versions },
        site,
        draftSchema ?? publishedSchema,
      ),
      draftSchema,
      publishedSchema,
      versions: versions.map((version) =>
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

type PageDetailVersion = PageVersionRecord & {
  schema: Prisma.JsonValue;
};

async function readPublishedVersion(
  prisma: PrismaService,
  input: {
    latest: PageDetailVersion | null;
    pageId: string;
    publishedVersionId: string | null;
  },
): Promise<PageDetailVersion | null> {
  if (!input.publishedVersionId) {
    return null;
  }

  if (input.latest?.id === input.publishedVersionId) {
    return input.latest;
  }

  return prisma.pageVersion.findFirst({
    where: {
      id: input.publishedVersionId,
      pageId: input.pageId,
    },
    select: pageVersionDetailSelect,
  });
}

function collectPageDetailVersions(
  latest: PageDetailVersion | null,
  published: PageDetailVersion | null,
): PageDetailVersion[] {
  const versions = [latest, published].filter(
    (version): version is PageDetailVersion => Boolean(version),
  );

  return versions.filter(
    (version, index) =>
      versions.findIndex((candidate) => candidate.id === version.id) === index,
  );
}
