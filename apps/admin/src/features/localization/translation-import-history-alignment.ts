import {
  readTranslationImportFocusFilters,
  readTranslationImportFocusKey,
} from "./translation-import-focus.ts";
import { areTranslationListFiltersEqual } from "./translation-list-query.ts";
import type {
  TranslationImportResult,
  TranslationListFilters,
} from "./types.ts";

export interface TranslationImportHistoryFilterAlignment {
  focusKey: string;
  message: string;
}

export function readTranslationImportHistoryFilterAlignment(input: {
  filters: TranslationListFilters;
  result: TranslationImportResult;
}): TranslationImportHistoryFilterAlignment | null {
  if (!hasActiveFilters(input.filters)) {
    return null;
  }

  const focusKey = readTranslationImportFocusKey(input.result);
  const focusFilters = readTranslationImportFocusFilters(
    input.result,
    input.filters,
  );

  if (
    !focusKey ||
    !focusFilters ||
    areTranslationListFiltersEqual(input.filters, focusFilters)
  ) {
    return null;
  }

  return {
    focusKey,
    message: `History replay is not aligned with current translation filters. Align filters to ${focusKey} before reviewing or rebuilding drafts from this replay.`,
  };
}

function hasActiveFilters(filters: TranslationListFilters): boolean {
  return Boolean(filters.namespace?.trim() || filters.query?.trim());
}
