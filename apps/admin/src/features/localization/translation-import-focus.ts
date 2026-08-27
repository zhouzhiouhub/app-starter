import { readTranslationKeyRepairFilters } from "./translation-list-query.ts";
import type { TranslationImportResult, TranslationListFilters } from "./types.ts";

export function readTranslationImportFocusKey(
  result: TranslationImportResult,
): string | null {
  return result.entries[0]?.key ?? null;
}

export function readTranslationImportFocusFilters(
  result: TranslationImportResult,
  currentFilters: TranslationListFilters = {},
): TranslationListFilters | null {
  const focusKey = readTranslationImportFocusKey(result);

  return focusKey
    ? readTranslationKeyRepairFilters(focusKey, currentFilters)
    : null;
}
