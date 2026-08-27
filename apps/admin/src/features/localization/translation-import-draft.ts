import { createTranslationKeyDraft } from "./translation-key-draft.ts";
import type { LocalizationTranslationEntry } from "./types.ts";

export interface TranslationImportDraftEntry {
  context: string;
  key: string;
  locale: string;
  value: string;
}

export interface TranslationImportDraft {
  entries: TranslationImportDraftEntry[];
}

export type TranslationImportDraftSource = "import-result" | "missing-keys";

export const defaultTranslationImportText = formatTranslationImportDraft({
  entries: [
    {
      context: "",
      key: "page.home.hero.title",
      locale: "en-US",
      value: "Build better storefronts",
    },
  ],
});

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

export function createTranslationImportDraftFromEntries(
  sourceEntries: LocalizationTranslationEntry[],
): TranslationImportDraft {
  const seen = new Set<string>();

  return {
    entries: sourceEntries.reduce<TranslationImportDraftEntry[]>(
      (entries, entry) => {
        const draft = createTranslationKeyDraft(entry.key);
        const locale = entry.locale.trim();
        const pairKey = `${locale}:${draft?.key}`;

        if (!draft || !locale || seen.has(pairKey)) {
          return entries;
        }

        seen.add(pairKey);
        entries.push({
          context: entry.context ?? draft.context,
          key: draft.key,
          locale,
          value: entry.value,
        });

        return entries;
      },
      [],
    ),
  };
}

export function formatTranslationImportDraftNotice(input: {
  entryCount: number;
  source: TranslationImportDraftSource;
}): string {
  const sourceLabel =
    input.source === "import-result" ? "imported row" : "missing key";
  const plural = input.entryCount === 1 ? "" : "s";

  return `Draft rebuilt from ${input.entryCount} ${sourceLabel}${plural}. Import preview is reset.`;
}

export function formatTranslationImportDraft(
  draft: TranslationImportDraft,
): string {
  return JSON.stringify(draft, null, 2);
}
