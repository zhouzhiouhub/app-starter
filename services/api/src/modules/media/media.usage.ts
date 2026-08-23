import { collectMediaReferences } from "@app-starter/schema";
import type { PrismaService } from "../prisma/prisma.service.js";

export type MediaUsage = {
  pageId: string;
  pageSlug: string;
  pageTitle: string;
  versionId: string;
  version: number;
  status: string;
};

export async function findMediaUsage(
  prisma: PrismaService,
  input: {
    mediaAssetId: string;
    tenantId: string;
  },
): Promise<MediaUsage[]> {
  const reference = `media://${input.mediaAssetId}`;
  const versions = await prisma.pageVersion.findMany({
    where: {
      page: {
        site: {
          tenantId: input.tenantId,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      page: {
        select: {
          id: true,
          slug: true,
          title: true,
        },
      },
      schema: true,
      status: true,
      version: true,
    },
  });

  return versions
    .filter((version) =>
      collectMediaReferences(version.schema).includes(reference),
    )
    .map((version) => ({
      pageId: version.page.id,
      pageSlug: version.page.slug,
      pageTitle: version.page.title,
      versionId: version.id,
      version: version.version,
      status: version.status,
    }));
}
