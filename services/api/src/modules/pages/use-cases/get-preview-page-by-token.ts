import { ServiceUnavailableException } from "@nestjs/common";
import { apiErrorCodes, type PageSchema } from "@app-starter/schema";
import type { PrismaService } from "../../prisma/prisma.service.js";
import {
  PreviewTokenConfigurationError,
  verifyPagePreviewToken,
} from "../pages.preview-token.js";
import { getPublicSite } from "../pages.site.js";
import { notFound, readSchema } from "../pages.validation.js";

type PreviewPageContext = {
  siteHost?: string | null;
};

export async function getPreviewPageByToken(
  prisma: PrismaService,
  token: string,
  requestId = "local-dev",
  resolveMediaReferences?: (
    schema: PageSchema,
    tenantId: string,
  ) => Promise<PageSchema>,
  context: PreviewPageContext = {},
) {
  const payload = verifyTokenOrThrow(token);
  const requestedSite = await readRequestedPreviewSite(
    prisma,
    context.siteHost,
  );
  const page = await prisma.page.findFirst({
    where: {
      id: payload.pageId,
      ...(requestedSite ? { siteId: requestedSite.id } : {}),
      site: {
        tenantId: payload.tenantId,
      },
    },
    include: {
      site: true,
      versions: {
        orderBy: { version: "desc" },
        take: 1,
      },
    },
  });

  if (!page || page.slug !== payload.slug) {
    throw notFound("Preview token is invalid or expired.");
  }

  const latestVersion = page.versions[0];

  if (!latestVersion) {
    throw notFound("Preview page has no draft schema.");
  }

  const schema = readSchema(latestVersion.schema, page.slug);
  const resolved = resolveMediaReferences
    ? await resolveMediaReferences(schema, payload.tenantId)
    : schema;

  return {
    data: resolved,
    meta: {
      requestId,
      tenantId: page.site.tenantId,
      siteId: page.site.id,
      preview: true,
      slug: page.slug,
      expiresAt: new Date(payload.exp * 1000).toISOString(),
    },
  };
}

async function readRequestedPreviewSite(
  prisma: PrismaService,
  siteHost: string | null | undefined,
) {
  if (!siteHost) {
    return null;
  }

  const site = await getPublicSite(prisma, siteHost);

  if (!site) {
    throw notFound("Preview token is invalid or expired.");
  }

  return site;
}

function verifyTokenOrThrow(token: string) {
  try {
    const payload = verifyPagePreviewToken(token);

    if (!payload) {
      throw notFound("Preview token is invalid or expired.");
    }

    return payload;
  } catch (error) {
    if (error instanceof PreviewTokenConfigurationError) {
      throw new ServiceUnavailableException({
        code: apiErrorCodes.INTERNAL_ERROR,
        message: error.message,
      });
    }

    throw error;
  }
}
