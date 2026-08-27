import {
  createMissingTranslationImportDraft,
  createTranslationImportDraftFromEntries,
  formatTranslationImportDraft,
  formatTranslationImportDraftNotice,
} from "./translation-import-draft.ts";
import {
  formatTranslationImportHistoryDraftMessage,
  type TranslationImportResultHistoryEntry,
} from "./translation-import-result-history.ts";
import type {
  TranslationImportResultEntry,
  TranslationListFilters,
} from "./types.ts";

export interface TranslationImportDraftState {
  entryCount: number;
  notice: string;
  text: string;
}

export function createMissingTranslationImportDraftState(input: {
  filters?: TranslationListFilters;
  keys: string[];
  locale: string;
}): TranslationImportDraftState {
  const draft = createMissingTranslationImportDraft(input.keys, input.locale);
  const notice = formatTranslationImportDraftNotice({
    entryCount: draft.entries.length,
    source: "missing-keys",
  });
  const filterNotice = formatMissingTranslationImportDraftFilterNotice({
    entryCount: draft.entries.length,
    filters: input.filters,
  });

  return {
    entryCount: draft.entries.length,
    notice: [notice, filterNotice].filter(Boolean).join(" "),
    text: formatTranslationImportDraft(draft),
  };
}

export function formatMissingTranslationImportDraftFilterNotice(input: {
  entryCount: number;
  filters?: TranslationListFilters;
}): string | null {
  if (input.entryCount <= 0) {
    return null;
  }

  const filters = [
    formatFilterPart("namespace", input.filters?.namespace),
    formatFilterPart("q", input.filters?.query),
  ].filter((part): part is string => Boolean(part));

  if (filters.length === 0) {
    return null;
  }

  return `Draft uses current translation filters (${filters.join(", ")}). After import, the translations table will focus the first repaired key and may update filters to that key.`;
}

export function createResultTranslationImportDraftState(
  entries: TranslationImportResultEntry[],
): TranslationImportDraftState {
  const draft = createTranslationImportDraftFromEntries(entries);

  return {
    entryCount: entries.length,
    notice: formatTranslationImportDraftNotice({
      entryCount: entries.length,
      source: "import-result",
    }),
    text: formatTranslationImportDraft(draft),
  };
}

export function createHistoryTranslationImportDraftState(
  entry: TranslationImportResultHistoryEntry,
): TranslationImportDraftState {
  const draft = createTranslationImportDraftFromEntries(entry.result.entries);

  return {
    entryCount: entry.result.entries.length,
    notice: formatTranslationImportHistoryDraftMessage(entry),
    text: formatTranslationImportDraft(draft),
  };
}

function formatFilterPart(
  label: string,
  value: string | undefined,
): string | null {
  const text = value?.trim();

  return text ? `${label}=${text}` : null;
}
