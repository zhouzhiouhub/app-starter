import { Injectable } from "@nestjs/common";
import type { Actor } from "../identity/identity.types.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { toTranslationResponse } from "./localization.mapper.js";
import { resolveTranslationLocale } from "./localization.validation.js";

@Injectable()
export class LocalizationService {
  constructor(private readonly prisma: PrismaService) {}

  async listTranslations(
    actor: Actor,
    locale?: string,
    requestId = "local-dev",
  ) {
    const localeContext = resolveTranslationLocale(locale);
    const translations = await this.prisma.translation.findMany({
      orderBy: { key: "asc" },
      where: {
        locale: localeContext.locale,
        tenantId: actor.tenantId,
      },
    });

    return {
      data: translations.map(toTranslationResponse),
      meta: {
        requestId,
        tenantId: actor.tenantId,
        locale: localeContext.locale,
        fallbackLocale: localeContext.fallbackLocale,
        isFallback: localeContext.isFallback,
      },
    };
  }
}
