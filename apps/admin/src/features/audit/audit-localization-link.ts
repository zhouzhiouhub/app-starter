import { buildTranslationListSearch } from "../localization/translation-list-query.ts";
import { appendTranslationAuditReturnContext } from "../localization/translation-audit-return-context.ts";
import type { TranslationListFilters } from "../localization/types.ts";
import type { AuditLog } from "./types.ts";

export function readAuditLogLocalizationPath(log: AuditLog): string | null {
  const auditSource = readAuditLocalizationSource(log);

  if (!auditSource) {
    return null;
  }

  const search = buildTranslationListSearch(
    isTranslationExportAuditLog(log)
      ? readExportTranslationFilters(log.metadata)
      : {},
  );
  const searchWithContext = appendTranslationAuditReturnContext(
    search,
    auditSource,
  );

  return `/localization?${searchWithContext}`;
}

function readAuditLocalizationSource(log: AuditLog) {
  if (isTranslationImportAuditLog(log)) {
    return "translation-imported";
  }

  if (isTranslationExportAuditLog(log)) {
    return "translation-exported";
  }

  return null;
}

function isTranslationImportAuditLog(log: AuditLog): boolean {
  return (
    log.action === "translation.imported" &&
    log.targetType === "translation-import"
  );
}

function isTranslationExportAuditLog(log: AuditLog): boolean {
  return (
    log.action === "translation.exported" &&
    log.targetType === "translation-export"
  );
}

function readExportTranslationFilters(
  metadata: unknown,
): TranslationListFilters {
  const record = readRecord(metadata);

  return {
    namespace: readText(record?.namespace),
    query: readText(record?.query),
  };
}

function readRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readText(value: unknown): string | undefined {
  const text = typeof value === "string" ? value.trim() : "";

  return text || undefined;
}
