import { Injectable } from "@nestjs/common";
import { translationEntryMaxCount } from "@app-starter/schema";
import type { Actor } from "../identity/identity.types.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { toTranslationResponse } from "./localization.mapper.js";
import { resolveTranslationLocale } from "./localization.validation.js";
import { upsertTranslation } from "./use-cases/upsert-translation.js";

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
      take: translationEntryMaxCount,
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
        entryLimit: translationEntryMaxCount,
        locale: localeContext.locale,
        fallbackLocale: localeContext.fallbackLocale,
        isFallback: localeContext.isFallback,
      },
    };
  }

  async upsertTranslation(
    body: unknown,
    idempotencyKey: string | undefined,
    actor: Actor,
    requestId = "local-dev",
  ) {
    return upsertTranslation(
      this.prisma,
      body,
      idempotencyKey,
      actor,
      requestId,
    );
  }
}
