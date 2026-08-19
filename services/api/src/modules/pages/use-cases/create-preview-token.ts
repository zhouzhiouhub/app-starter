import { ServiceUnavailableException } from "@nestjs/common";
import { apiErrorCodes } from "@app-starter/schema";
import type { Actor } from "../../identity/identity.types.js";
import type { PrismaService } from "../../prisma/prisma.service.js";
import {
  createPagePreviewToken,
  PreviewTokenConfigurationError,
} from "../pages.preview-token.js";
import { getSiteForTenant } from "../pages.site.js";
import { notFound } from "../pages.validation.js";

export async function createPreviewToken(
  prisma: PrismaService,
  id: string,
  actor: Actor,
) {
  const site = await getSiteForTenant(prisma, actor.tenantId);
  const page = await prisma.page.findFirst({
    where: {
      id,
      siteId: site.id,
    },
    select: {
      id: true,
      slug: true,
    },
  });

  if (!page) {
    throw notFound("Page not found.");
  }

  try {
    const preview = createPagePreviewToken({
      pageId: page.id,
      slug: page.slug,
      tenantId: actor.tenantId,
    });

    return {
      data: {
        expiresAt: preview.expiresAt.toISOString(),
        slug: page.slug,
        token: preview.token,
      },
      meta: {
        requestId: "local-dev",
        tenantId: site.tenantId,
        siteId: site.id,
      },
    };
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
