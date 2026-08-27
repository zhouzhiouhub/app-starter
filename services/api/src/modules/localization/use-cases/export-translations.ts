import { ConflictException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { apiErrorCodes, translationEntryMaxCount } from "@app-starter/schema";
import type { Actor } from "../../identity/identity.types.js";
import type { PrismaService } from "../../prisma/prisma.service.js";
import { toTranslationResponse } from "../localization.mapper.js";
import { parseTranslationExportPreviewInput } from "../localization.bulk-preview.validation.js";
import { createTranslationWhere } from "../localization.translation-filters.js";
import { readTranslationCoverage } from "../localization.translation-coverage.js";
import { resolveTranslationLocale } from "../localization.validation.js";

export async function exportTranslations(
  prisma: PrismaService,
  body: unknown,
  actor: Actor,
  requestId = "local-dev",
) {
  const input = parseTranslationExportPreviewInput(body);
  const localeContext = resolveTranslationLocale(input.locale);
  const where = createTranslationWhere({
    locale: localeContext.locale,
    namespace: input.namespace,
    query: input.q,
    tenantId: actor.tenantId,
  });
  const [translations, coverage] = await Promise.all([
    prisma.translation.findMany({
      orderBy: { key: "asc" },
      take: translationEntryMaxCount + 1,
      where,
    }),
    readTranslationCoverage(prisma, {
      locale: localeContext.locale,
      namespace: input.namespace,
      query: input.q,
      tenantId: actor.tenantId,
    }),
  ]);

  if (translations.length > translationEntryMaxCount) {
    throw new ConflictException({
      code: apiErrorCodes.CONFLICT,
      message: `Translation export is limited to ${translationEntryMaxCount} entries.`,
      requestId,
    });
  }

  const entries = translations.map(toTranslationResponse);

  await prisma.auditLog.create({
    data: {
      action: "translation.exported",
      actorId: actor.id,
      metadata: {
        entryCount: entries.length,
        expectedKeyCount: coverage.expectedKeyCount,
        isFallback: localeContext.isFallback,
        locale: localeContext.locale,
        missingKeyCount: coverage.missingKeyCount,
        namespace: input.namespace ?? null,
        query: input.q ?? null,
      } as Prisma.InputJsonValue,
      requestId,
      targetId: localeContext.locale,
      targetType: "translation-export",
      tenantId: actor.tenantId,
    },
  });

  return {
    data: {
      contentType: "application/json",
      entries,
      entryCount: entries.length,
      exportVersion: "translation-export.v1",
      filename: `translations-${localeContext.locale}.json`,
      format: "json",
      locale: localeContext.locale,
      ...coverage,
    },
    meta: {
      requestId,
      tenantId: actor.tenantId,
      fallbackLocale: localeContext.fallbackLocale,
      isFallback: localeContext.isFallback,
      locale: localeContext.locale,
      namespace: input.namespace,
      preview: false,
      query: input.q,
    },
  };
}
