import type {
  TranslationImportResult,
  TranslationImportResultAction,
  TranslationImportResultEntry,
} from "./types.ts";

export type TranslationImportResultActionFilter =
  "all" | TranslationImportResultAction;

export interface TranslationImportResultActionOption {
  count: number;
  label: string;
  value: TranslationImportResultActionFilter;
}

export function filterTranslationImportResultEntries(
  result: TranslationImportResult,
  action: TranslationImportResultActionFilter,
): TranslationImportResultEntry[] {
  if (action === "all") {
    return result.entries;
  }

  return result.entries.filter((entry) => entry.action === action);
}

export function readTranslationImportResultRowKey(
  entry: TranslationImportResultEntry,
): string {
  return `${entry.index}:${entry.locale}:${entry.key}`;
}

export function readSelectedTranslationImportResultEntries(
  result: TranslationImportResult,
  rowKeys: string[],
): TranslationImportResultEntry[] {
  const selectedKeys = new Set(rowKeys);

  return result.entries.filter((entry) =>
    selectedKeys.has(readTranslationImportResultRowKey(entry)),
  );
}

export function readTranslationImportResultActionOptions(
  result: TranslationImportResult,
): TranslationImportResultActionOption[] {
  return [
    {
      count: result.summary.importedCount,
      label: "All",
      value: "all",
    },
    {
      count: result.summary.createdCount,
      label: "Created",
      value: "create",
    },
    {
      count: result.summary.updatedCount,
      label: "Updated",
      value: "update",
    },
  ];
}
