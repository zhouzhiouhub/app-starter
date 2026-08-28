import { formatTranslationBulkLongListConfirmation } from "./translation-bulk-long-list-confirmation.ts";
import { formatDefaultLocaleImportConfirmationSummary } from "./translation-import-confirmation.ts";
import type {
  LocalizationTranslationsMeta,
  TranslationExportPreviewResult,
  TranslationImportPreviewResult,
  TranslationListFilters,
} from "./types.ts";

export function formatTranslationBulkImportConfirmationSummary(input: {
  filters: TranslationListFilters;
  importText: string;
  meta: LocalizationTranslationsMeta;
  missingKeys?: string[];
  preview?: TranslationImportPreviewResult | null;
}): string {
  const importSummary = formatDefaultLocaleImportConfirmationSummary({
    defaultLocale: input.meta.locale,
    importText: input.importText,
    missingKeys: input.missingKeys,
    preview: input.preview,
  });
  const longListSummary = formatTranslationBulkLongListConfirmation({
    action: "import",
    filters: input.filters,
    meta: input.meta,
  });

  return [importSummary, longListSummary].filter(Boolean).join(" ");
}

export function formatTranslationBulkExportConfirmationSummary(input: {
  exportPreview?: TranslationExportPreviewResult | null;
  filters: TranslationListFilters;
  meta: LocalizationTranslationsMeta;
}): string | null {
  return formatTranslationBulkLongListConfirmation({
    action: "export-download",
    exportPreview: input.exportPreview,
    filters: input.filters,
    meta: input.meta,
  });
}
