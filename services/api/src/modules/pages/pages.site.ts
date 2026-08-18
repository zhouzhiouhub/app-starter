import { ServiceUnavailableException } from "@nestjs/common";
import { apiErrorCodes } from "@app-starter/schema";
import type { PrismaService } from "../prisma/prisma.service.js";
import { DEFAULT_SITE_DOMAIN } from "./pages.constants.js";

export async function getSiteForTenant(
  prisma: PrismaService,
  tenantId: string,
) {
  const site = await prisma.site.findFirst({
    where: { domain: DEFAULT_SITE_DOMAIN, tenantId },
  });

  if (!site) {
    throw missingDefaultSite();
  }

  return site;
}

export async function getPublicDefaultSite(prisma: PrismaService) {
  const site = await prisma.site.findUnique({
    where: { domain: DEFAULT_SITE_DOMAIN },
  });

  if (!site) {
    throw missingDefaultSite();
  }

  return site;
}

function missingDefaultSite() {
  return new ServiceUnavailableException({
    code: apiErrorCodes.INTERNAL_ERROR,
    message:
      "Default site is missing. Run `pnpm --filter @app-starter/api run prisma:seed`.",
  });
}
