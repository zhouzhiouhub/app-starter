import type { PageSchema } from "@app-starter/schema";
import type { PrismaService } from "../../prisma/prisma.service.js";
import { getPublicDefaultSite } from "../pages.site.js";
import { parseSlug, readSchema } from "../pages.validation.js";

export async function getPublishedPageBySlug(
  prisma: PrismaService,
  slug: string,
): Promise<PageSchema | null> {
  const site = await getPublicDefaultSite(prisma);
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

  return readSchema(published.schema, page.slug);
}
