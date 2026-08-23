import { ServiceUnavailableException } from "@nestjs/common";
import { apiErrorCodes, readSiteDomainHeader } from "@app-starter/schema";
import type { PrismaService } from "../prisma/prisma.service.js";
import { DEFAULT_SITE_DOMAIN } from "./pages.constants.js";

export async function getSiteForTenant(
  prisma: PrismaService,
  tenantId: string,
) {
  const site = await prisma.site.findFirst({
    where: { domain: DEFAULT_SITE_DOMAIN, tenantId },
  });

  if (site) {
    return site;
  }

  const fallback = await prisma.site.findFirst({
    where: { tenantId },
    orderBy: { createdAt: "asc" },
  });

  if (!fallback) {
    throw missingDefaultSite();
  }

  return fallback;
}

export async function getPublicDefaultSite(prisma: PrismaService) {
  const site = await prisma.site.findUnique({
    where: { domain: DEFAULT_SITE_DOMAIN },
  });

  if (site) {
    return site;
  }

  const fallback = await prisma.site.findFirst({
    orderBy: { createdAt: "asc" },
  });

  if (!fallback) {
    throw missingDefaultSite();
  }

  return fallback;
}

export async function getPublicSite(
  prisma: PrismaService,
  siteHost?: string | null,
) {
  const domain = readSiteDomainHeader(siteHost);

  if (!domain && hasExplicitSiteHost(siteHost)) {
    return null;
  }

  if (domain) {
    const site = await prisma.site.findUnique({
      where: { domain },
    });

    if (site) {
      return site;
    }

    if (!isLocalSiteDomain(domain)) {
      return null;
    }
  }

  return getPublicDefaultSite(prisma);
}

function hasExplicitSiteHost(siteHost: string | null | undefined): boolean {
  return typeof siteHost === "string" && siteHost.trim().length > 0;
}

function missingDefaultSite() {
  return new ServiceUnavailableException({
    code: apiErrorCodes.INTERNAL_ERROR,
    message:
      "Default site is missing. Run `pnpm --filter @app-starter/api run prisma:seed`.",
  });
}

function isLocalSiteDomain(domain: string): boolean {
  return (
    domain === DEFAULT_SITE_DOMAIN ||
    domain.startsWith(`${DEFAULT_SITE_DOMAIN}:`)
  );
}
