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
import type { TranslationImportResultEntry } from "./types.ts";

export interface TranslationImportDraftState {
  entryCount: number;
  notice: string;
  text: string;
}

export function createMissingTranslationImportDraftState(input: {
  keys: string[];
  locale: string;
}): TranslationImportDraftState {
  const draft = createMissingTranslationImportDraft(input.keys, input.locale);

  return {
    entryCount: draft.entries.length,
    notice: formatTranslationImportDraftNotice({
      entryCount: draft.entries.length,
      source: "missing-keys",
    }),
    text: formatTranslationImportDraft(draft),
  };
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
