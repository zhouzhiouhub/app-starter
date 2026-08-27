import { createTranslationKeyDraft } from "./translation-key-draft.ts";

export interface TranslationImportDraftEntry {
  context: string;
  key: string;
  locale: string;
  value: string;
}

export interface TranslationImportDraft {
  entries: TranslationImportDraftEntry[];
}

export function createMissingTranslationImportDraft(
  keys: string[],
  locale: string,
): TranslationImportDraft {
  const seen = new Set<string>();

  return {
    entries: keys.reduce<TranslationImportDraftEntry[]>((entries, key) => {
      const draft = createTranslationKeyDraft(key);

      if (!draft || seen.has(draft.key)) {
        return entries;
      }

      seen.add(draft.key);
      entries.push({
        context: draft.context,
        key: draft.key,
        locale,
        value: "",
      });

      return entries;
    }, []),
  };
}

export function formatTranslationImportDraft(
  draft: TranslationImportDraft,
): string {
  return JSON.stringify(draft, null, 2);
}
