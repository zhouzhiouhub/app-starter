import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";
import { PagesService } from "../pages/pages.service.js";
import { resolvePublicLocale } from "./public.runtime-config.js";

@Injectable()
export class PublicTranslationsService {
  constructor(
    private readonly pages: PagesService,
    private readonly prisma: PrismaService,
  ) {}

  async list(input: {
    locale: string;
    requestId?: string;
    siteHost?: string | null;
  }) {
    const localeContext = resolvePublicLocale(input.locale);
    const site = await this.pages.getPublicSiteContext(input.siteHost);

    if (!site) {
      return createPublicTranslationResponse({
        localeContext,
        requestId: input.requestId,
        siteId: null,
        tenantId: null,
        translations: [],
      });
    }

    const translations = await this.prisma.translation.findMany({
      orderBy: { key: "asc" },
      where: {
        locale: localeContext.locale,
        tenantId: site.tenantId,
      },
    });

    return createPublicTranslationResponse({
      localeContext,
      requestId: input.requestId,
      siteId: site.siteId,
      tenantId: site.tenantId,
      translations,
    });
  }
}

function createPublicTranslationResponse(input: {
  localeContext: ReturnType<typeof resolvePublicLocale>;
  requestId?: string;
  siteId: string | null;
  tenantId: string | null;
  translations: Array<{ key: string; value: string }>;
}) {
  return {
    data: {
      locale: input.localeContext.locale,
      messages: Object.fromEntries(
        input.translations.map((translation) => [
          translation.key,
          translation.value,
        ]),
      ),
    },
    meta: {
      requestId: input.requestId ?? "local-dev",
      tenantId: input.tenantId,
      siteId: input.siteId,
      total: input.translations.length,
      locale: input.localeContext.locale,
      fallbackLocale: input.localeContext.fallbackLocale,
      isFallback: input.localeContext.isFallback,
    },
  };
}
