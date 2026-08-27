import { readTranslationKeyRepairFilters } from "./translation-list-query.ts";
import type {
  TranslationImportResult,
  TranslationListFilters,
} from "./types.ts";

export function readTranslationImportFocusKey(
  result: TranslationImportResult,
): string | null {
  return result.entries[0]?.key ?? null;
}

export function readTranslationImportFocusedResultKey(
  result: TranslationImportResult,
  focusedKey?: string | null,
): string | null {
  if (focusedKey && result.entries.some((entry) => entry.key === focusedKey)) {
    return focusedKey;
  }

  return readTranslationImportFocusKey(result);
}

export function readTranslationImportFocusFiltersForKey(
  key: string,
  currentFilters: TranslationListFilters = {},
): TranslationListFilters | null {
  return readTranslationKeyRepairFilters(key, currentFilters);
}

export function readTranslationImportFocusFilters(
  result: TranslationImportResult,
  currentFilters: TranslationListFilters = {},
): TranslationListFilters | null {
  const focusKey = readTranslationImportFocusKey(result);

  return focusKey
    ? readTranslationImportFocusFiltersForKey(focusKey, currentFilters)
    : null;
}
