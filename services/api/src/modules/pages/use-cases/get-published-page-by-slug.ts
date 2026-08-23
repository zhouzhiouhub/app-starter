import type { PageSchema } from "@app-starter/schema";
import type { PrismaService } from "../../prisma/prisma.service.js";
import {
  matchesPublishedPageContext,
  type PublishedPageContext,
} from "../pages.public-context.js";
import { readPublishedSchemaSafely } from "../pages.public-schema.js";
import { getPublicSite } from "../pages.site.js";
import { parseSlug } from "../pages.validation.js";

export async function getPublishedPageBySlug(
  prisma: PrismaService,
  slug: string,
  context: PublishedPageContext,
  resolveMediaReferences?: (
    schema: PageSchema,
    tenantId: string,
  ) => Promise<PageSchema>,
): Promise<PageSchema | null> {
  const site = await getPublicSite(prisma, context.siteHost);

  if (!site) {
    return null;
  }

  const normalizedSlug = parseSlug(slug);
  const page = await prisma.page.findUnique({
    where: {
      siteId_slug: {
        siteId: site.id,
        slug: normalizedSlug,
      },
    },
    include: {
      versions: true,
    },
  });

  if (!page?.publishedVersionId) {
    return null;
  }

  const published = page.versions.find(
    (version) => version.id === page.publishedVersionId,
  );

  if (!published) {
    return null;
  }

  const schema = readPublishedSchemaSafely(published.schema, page.slug);
  if (!schema) {
    return null;
  }

  if (!matchesPublishedPageContext(schema, context)) {
    return null;
  }

  return resolveMediaReferences
    ? resolveMediaReferences(schema, site.tenantId)
    : schema;
}
