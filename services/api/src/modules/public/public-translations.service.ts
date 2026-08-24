import { Injectable } from "@nestjs/common";
import {
  publicTranslationKeyMaxLength,
  publicTranslationMessageMaxLength,
} from "@app-starter/schema";
import { PrismaService } from "../prisma/prisma.service.js";
import { PagesService } from "../pages/pages.service.js";
import { resolvePublicLocale } from "./public.runtime-config.js";

const forbiddenPublicTranslationMessageKeys = new Set([
  "__proto__",
  "constructor",
  "prototype",
]);

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
  const messages = createPublicTranslationMessages(input.translations);

  return {
    data: {
      locale: input.localeContext.locale,
      messages,
    },
    meta: {
      requestId: input.requestId ?? "local-dev",
      tenantId: input.tenantId,
      siteId: input.siteId,
      total: Object.keys(messages).length,
      locale: input.localeContext.locale,
      fallbackLocale: input.localeContext.fallbackLocale,
      isFallback: input.localeContext.isFallback,
    },
  };
}

function createPublicTranslationMessages(
  translations: Array<{ key: string; value: string }>,
) {
  const messages: Record<string, string> = {};

  for (const translation of translations) {
    if (isSafePublicTranslationEntry(translation)) {
      messages[translation.key] = translation.value;
    }
  }

  return messages;
}

function isSafePublicTranslationEntry(translation: {
  key: string;
  value: string;
}) {
  return (
    isSafePublicTranslationKey(translation.key) &&
    translation.value.length <= publicTranslationMessageMaxLength
  );
}

function isSafePublicTranslationKey(key: string) {
  return (
    key.trim() === key &&
    key.length > 0 &&
    key.length <= publicTranslationKeyMaxLength &&
    !forbiddenPublicTranslationMessageKeys.has(key.toLowerCase()) &&
    !hasControlCharacter(key)
  );
}

function hasControlCharacter(value: string) {
  return Array.from(value).some((character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    return codePoint <= 0x1f || codePoint === 0x7f;
  });
}
