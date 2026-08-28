import { buildAuditLogSearch } from "../audit/filter-query.ts";

export function buildTranslationImportAuditLogPath(): string {
  return buildTranslationAuditLogPath({
    action: "translation.imported",
    targetId: "translations",
    targetType: "translation-import",
  });
}

export function buildTranslationExportAuditLogPath(locale: string): string {
  return buildTranslationAuditLogPath({
    action: "translation.exported",
    targetId: readAuditLocale(locale),
    targetType: "translation-export",
  });
}

function buildTranslationAuditLogPath(filters: {
  action: string;
  targetId: string;
  targetType: string;
}): string {
  return `/audit-logs?${buildAuditLogSearch(filters)}`;
}

function readAuditLocale(locale: string): string {
  const normalized = locale.trim();

  return /^[a-zA-Z0-9-]+$/.test(normalized) ? normalized : "en-US";
}
