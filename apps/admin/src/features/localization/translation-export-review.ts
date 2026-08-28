import type {
  TranslationExportResult,
  TranslationListFilters,
} from "./types.ts";

export interface TranslationExportReviewNotice {
  message: string;
  type: "success";
}

export function createTranslationExportSuccessReviewNotice(input: {
  filters: TranslationListFilters;
  result: TranslationExportResult;
}): TranslationExportReviewNotice {
  const filterHint = formatTranslationExportFilterHint(input.filters);
  const missingHint =
    input.result.missingKeyCount > 0
      ? ` ${input.result.missingKeyCount} expected ${formatCountLabel(input.result.missingKeyCount, "key")} still missing.`
      : "";

  return {
    message: `Export review: ${input.result.entryCount} default ${input.result.locale} ${formatCountLabel(input.result.entryCount, "row")} downloaded as ${input.result.filename}.${filterHint}${missingHint}`,
    type: "success",
  };
}

function formatTranslationExportFilterHint(
  filters: TranslationListFilters,
): string {
  const parts = [
    formatFilterPart("namespace", filters.namespace),
    formatFilterPart("q", filters.query),
  ].filter((part): part is string => Boolean(part));

  return parts.length > 0
    ? ` Audit replay keeps the export filters (${parts.join(", ")}).`
    : " Audit replay keeps the default Locale export scope.";
}

function formatFilterPart(
  label: string,
  value: string | undefined,
): string | null {
  const text = value?.trim();

  return text ? `${label}=${text}` : null;
}

function formatCountLabel(count: number, singular: string): string {
  return count === 1 ? singular : `${singular}s`;
}
