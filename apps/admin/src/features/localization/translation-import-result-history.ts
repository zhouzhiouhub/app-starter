import type { TranslationImportResult } from "./types.ts";

export interface TranslationImportResultHistoryEntry {
  id: string;
  label: string;
  result: TranslationImportResult;
}

export function createTranslationImportResultHistoryEntry(
  result: TranslationImportResult,
  sequence: number,
): TranslationImportResultHistoryEntry {
  return {
    id: String(sequence),
    label: `Import #${sequence}`,
    result,
  };
}

export function addTranslationImportResultHistoryEntry(
  current: TranslationImportResultHistoryEntry[],
  next: TranslationImportResultHistoryEntry,
  limit = 3,
): TranslationImportResultHistoryEntry[] {
  return [next, ...current.filter((entry) => entry.id !== next.id)].slice(
    0,
    Math.max(1, limit),
  );
}

export function clearTranslationImportResultHistory(): TranslationImportResultHistoryEntry[] {
  return [];
}

export function formatTranslationBulkRepairCompletionMessage(input: {
  locale: string;
  missingKeys?: string[];
  result: TranslationImportResult;
}): string | null {
  const missingKeys = readUniqueKeys(input.missingKeys ?? []);

  if (missingKeys.length === 0) {
    return null;
  }

  const importedKeys = new Set(
    input.result.entries.map((entry) => entry.key.trim()),
  );
  const coveredCount = missingKeys.filter((key) =>
    importedKeys.has(key),
  ).length;

  if (coveredCount !== missingKeys.length) {
    return null;
  }

  return `Bulk repair covered all ${missingKeys.length} visible missing keys for default ${input.locale}. Refresh will confirm server coverage.`;
}

function readUniqueKeys(keys: string[]): string[] {
  const seen = new Set<string>();
  const uniqueKeys: string[] = [];

  for (const key of keys) {
    const normalizedKey = key.trim();

    if (!normalizedKey || seen.has(normalizedKey)) {
      continue;
    }

    seen.add(normalizedKey);
    uniqueKeys.push(normalizedKey);
  }

  return uniqueKeys;
}
