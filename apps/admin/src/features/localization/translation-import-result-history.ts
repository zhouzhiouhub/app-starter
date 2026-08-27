import type { TranslationBulkLoadingAction } from "./translation-bulk-action.ts";
import type {
  TranslationImportResult,
  TranslationImportResultAction,
} from "./types.ts";

export interface TranslationImportResultHistoryEntry {
  id: string;
  label: string;
  result: TranslationImportResult;
}

export type TranslationImportResultHistoryFilter =
  "all" | TranslationImportResultAction;

export interface TranslationImportResultHistoryFilterOption {
  count: number;
  label: string;
  value: TranslationImportResultHistoryFilter;
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

export function formatTranslationImportHistoryClearConfirmation(input: {
  historyCount: number;
}): string | null {
  if (input.historyCount <= 0) {
    return null;
  }

  return `Clear ${input.historyCount} recent import ${input.historyCount === 1 ? "result" : "results"}? Saved translations stay unchanged; only local replay and draft history is removed.`;
}

export function filterTranslationImportResultHistoryEntries(
  entries: TranslationImportResultHistoryEntry[],
  filter: TranslationImportResultHistoryFilter,
): TranslationImportResultHistoryEntry[] {
  if (filter === "all") {
    return entries;
  }

  return entries.filter((entry) =>
    entry.result.entries.some((resultEntry) => resultEntry.action === filter),
  );
}

export function readTranslationImportResultHistoryFilterOptions(
  entries: TranslationImportResultHistoryEntry[],
): TranslationImportResultHistoryFilterOption[] {
  return [
    { count: entries.length, label: "All", value: "all" },
    {
      count: filterTranslationImportResultHistoryEntries(entries, "create")
        .length,
      label: "Created",
      value: "create",
    },
    {
      count: filterTranslationImportResultHistoryEntries(entries, "update")
        .length,
      label: "Updated",
      value: "update",
    },
  ];
}

export function formatTranslationImportHistoryFilterEmptyMessage(input: {
  filter: TranslationImportResultHistoryFilter;
  totalCount: number;
}): string | null {
  if (input.totalCount <= 0 || input.filter === "all") {
    return null;
  }

  const actionLabel = input.filter === "create" ? "created" : "updated";

  return `No recent import results include ${actionLabel} rows. Switch to All to replay another result or rebuild a draft from it.`;
}

export function formatTranslationImportHistoryReplayMessage(
  entry: TranslationImportResultHistoryEntry,
  options: { focusKey?: string | null } = {},
): string {
  const focusHint = options.focusKey
    ? ` Translations table is focused on ${options.focusKey}.`
    : "";

  return `Viewing ${entry.label} from recent import history. This only replays the result table and does not re-import data.${focusHint}`;
}

export function formatTranslationImportHistoryDraftMessage(
  entry: TranslationImportResultHistoryEntry,
): string {
  const entryCount = entry.result.entries.length;

  return `Draft rebuilt from ${entry.label} with ${entryCount} imported ${entryCount === 1 ? "row" : "rows"}. Import preview is reset.`;
}

export function formatTranslationImportHistoryReplayCleanupSuggestion(input: {
  historyCount: number;
}): string | null {
  if (input.historyCount <= 0) {
    return null;
  }

  return `History replay is visible. Clear ${input.historyCount} recent import ${input.historyCount === 1 ? "result" : "results"} and the replayed result after confirming the table focus.`;
}

export function formatTranslationBulkRepairHistoryRetentionMessage(input: {
  historyCount: number;
}): string | null {
  if (input.historyCount <= 0) {
    return null;
  }

  return `Recent import history is retained after bulk repair for replay, follow-up drafts, and server confirmation. Clear ${input.historyCount} ${input.historyCount === 1 ? "result" : "results"} after checking the repaired rows.`;
}

export function formatTranslationBulkRepairCleanupSuggestion(input: {
  historyCount: number;
}): string | null {
  if (input.historyCount <= 0) {
    return null;
  }

  return `Server confirmation is complete. Clear ${input.historyCount} recent import ${input.historyCount === 1 ? "result" : "results"} when you no longer need replay.`;
}

export function readTranslationBulkRepairCoveredMissingKeys(input: {
  missingKeys?: string[];
  result: TranslationImportResult;
}): string[] {
  const missingKeys = readUniqueKeys(input.missingKeys ?? []);

  if (missingKeys.length === 0) {
    return [];
  }

  const importedKeys = new Set(
    input.result.entries.map((entry) => entry.key.trim()),
  );
  const coveredKeys = missingKeys.filter((key) => importedKeys.has(key));

  return coveredKeys.length === missingKeys.length ? coveredKeys : [];
}

export function formatTranslationBulkRepairCompletionMessage(input: {
  locale: string;
  missingKeys?: string[];
  result: TranslationImportResult;
}): string | null {
  const coveredKeys = readTranslationBulkRepairCoveredMissingKeys(input);

  if (coveredKeys.length === 0) {
    return null;
  }

  return `Bulk repair covered all ${coveredKeys.length} visible missing keys for default ${input.locale}. Refresh will confirm server coverage.`;
}

export function formatTranslationBulkRepairServerConfirmationMessage(input: {
  focusKey?: string | null;
  locale: string;
  missingKeys?: string[];
  repairedKeys: string[];
}): string | null {
  const repairedKeys = readUniqueKeys(input.repairedKeys);

  if (repairedKeys.length === 0) {
    return null;
  }

  const remainingKeys = readTranslationBulkRepairRemainingKeys({
    missingKeys: input.missingKeys,
    repairedKeys,
  });

  if (remainingKeys.length > 0) {
    return `Server still reports ${remainingKeys.length} repaired ${formatKeyLabel(remainingKeys.length)} as missing for default ${input.locale}. Refresh again or retry the import after checking the payload.`;
  }

  const focusHint = input.focusKey
    ? ` Translations table is focused on ${input.focusKey}.`
    : "";

  return `Server confirmed ${repairedKeys.length} repaired ${formatKeyLabel(repairedKeys.length)} for default ${input.locale}.${focusHint}`;
}

export function readTranslationBulkRepairRemainingKeys(input: {
  missingKeys?: string[];
  repairedKeys: string[];
}): string[] {
  const missingKeys = new Set(readUniqueKeys(input.missingKeys ?? []));

  return readUniqueKeys(input.repairedKeys).filter((key) =>
    missingKeys.has(key),
  );
}

export function formatTranslationBulkRetryError(input: {
  action: TranslationBulkLoadingAction;
  message: string;
}): string {
  return `${input.message} ${readRetryHint(input.action)}`;
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

function formatKeyLabel(count: number): string {
  return count === 1 ? "key" : "keys";
}

function readRetryHint(action: TranslationBulkLoadingAction): string {
  if (action === "preview-import") {
    return "Check the JSON, then retry Preview import.";
  }

  if (action === "import") {
    return "Check the import payload, then retry Import default locale.";
  }

  if (action === "export") {
    return "Refresh filters, then retry Preview export.";
  }

  return "Refresh filters, then retry Export JSON.";
}
