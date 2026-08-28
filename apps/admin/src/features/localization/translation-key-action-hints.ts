import type { TranslationImportResultHistoryEntry } from "./translation-import-result-history.ts";

export function formatTranslationImportHistoryActionHint(input: {
  action: "draft" | "view";
  entry: TranslationImportResultHistoryEntry;
}): string {
  const keyHint = formatKeyListHint(
    input.entry.result.entries.map((entry) => entry.key),
  );

  if (input.action === "draft") {
    return `${input.entry.label} contains ${keyHint}. Draft rebuilds editable default Locale rows from these imported keys.`;
  }

  return `${input.entry.label} contains ${keyHint}. View replays the saved result table without importing data.`;
}

export function formatTranslationImportResultFocusHint(input: {
  focusSource?: "history" | "import";
  isFocused?: boolean;
  key: string;
}): string {
  const key = input.key.trim();

  if (input.isFocused) {
    return `${key} is already focused in the translations table.`;
  }

  if (input.focusSource === "history") {
    return `Focus ${key} from this history replay; no data is re-imported.`;
  }

  return `Focus ${key} in the translations table to review the saved default Locale row.`;
}

export function formatMissingTranslationKeyFillHint(input: {
  key: string;
  locale: string;
}): string {
  return `Fill default ${input.locale} for ${input.key.trim()}; the form and translation filters will move to this key.`;
}

export function formatMissingTranslationKeyQueueNavigationHint(input: {
  action: "next" | "previous" | "start";
  key: string;
  locale: string;
}): string {
  const key = input.key.trim();

  if (input.action === "previous") {
    return `Move to previous missing key ${key} for default ${input.locale}.`;
  }

  if (input.action === "next") {
    return `Move to next missing key ${key} for default ${input.locale}.`;
  }

  return `Start repairing ${key} for default ${input.locale}.`;
}

function formatKeyListHint(keys: string[]): string {
  const normalizedKeys = readUniqueKeys(keys);

  if (normalizedKeys.length === 0) {
    return "no key rows";
  }

  if (normalizedKeys.length === 1) {
    return `1 key (${normalizedKeys[0]})`;
  }

  return `${normalizedKeys.length} keys (first ${normalizedKeys[0]})`;
}

function readUniqueKeys(keys: string[]): string[] {
  const seen = new Set<string>();
  const normalizedKeys: string[] = [];

  for (const key of keys) {
    const normalizedKey = key.trim();

    if (!normalizedKey || seen.has(normalizedKey)) {
      continue;
    }

    seen.add(normalizedKey);
    normalizedKeys.push(normalizedKey);
  }

  return normalizedKeys;
}
