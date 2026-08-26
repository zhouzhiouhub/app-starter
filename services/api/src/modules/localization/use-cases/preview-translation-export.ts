import { translationExportPreviewKeyMaxCount } from "@app-starter/schema";
import type { Actor } from "../../identity/identity.types.js";
import type { PrismaService } from "../../prisma/prisma.service.js";
import { parseTranslationExportPreviewInput } from "../localization.bulk-preview.validation.js";
import { createTranslationWhere } from "../localization.translation-filters.js";
import { readTranslationCoverage } from "../localization.translation-coverage.js";
import { resolveTranslationLocale } from "../localization.validation.js";

export async function previewTranslationExport(
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
  const [total, sampleKeys, coverage] = await Promise.all([
    prisma.translation.count({ where }),
    prisma.translation.findMany({
      orderBy: { key: "asc" },
      select: { key: true },
      take: translationExportPreviewKeyMaxCount,
      where,
    }),
    readTranslationCoverage(prisma, {
      locale: localeContext.locale,
      namespace: input.namespace,
      query: input.q,
      tenantId: actor.tenantId,
    }),
  ]);

  return {
    data: {
      exportableEntryCount: total,
      locale: localeContext.locale,
      sampleKeyLimit: translationExportPreviewKeyMaxCount,
      sampleKeys: sampleKeys.map((entry) => entry.key),
      ...coverage,
    },
    meta: {
      requestId,
      tenantId: actor.tenantId,
      fallbackLocale: localeContext.fallbackLocale,
      isFallback: localeContext.isFallback,
      locale: localeContext.locale,
      namespace: input.namespace,
      preview: true,
      query: input.q,
    },
  };
}
