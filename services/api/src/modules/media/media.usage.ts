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
    limit?: number;
    mediaAssetId: string;
    tenantId: string;
  },
): Promise<MediaUsage[]> {
  const reference = `media://${input.mediaAssetId}`;
  const limit = normalizeUsageLimit(input.limit);
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

  const usage: MediaUsage[] = [];

  for (const version of versions) {
    if (!collectMediaReferences(version.schema).includes(reference)) {
      continue;
    }

    usage.push({
      pageId: version.page.id,
      pageSlug: version.page.slug,
      pageTitle: version.page.title,
      versionId: version.id,
      version: version.version,
      status: version.status,
    });

    if (usage.length >= limit) {
      break;
    }
  }

  return usage;
}

function normalizeUsageLimit(value: number | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 10;
  }

  return Math.max(1, Math.floor(value));
}
