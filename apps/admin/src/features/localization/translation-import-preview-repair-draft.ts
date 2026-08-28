import {
  createTranslationImportDraftFromEntries,
  formatTranslationImportDraft,
} from "./translation-import-draft.ts";
import type { TranslationImportDraftEntry } from "./translation-import-draft.ts";
import type {
  LocalizationTranslationEntry,
  TranslationImportPreviewEntry,
  TranslationImportPreviewResult,
} from "./types.ts";

export interface TranslationImportPreviewRepairDraftState {
  detailMessage: string | null;
  entryCount: number;
  notice: string;
  text: string;
}

interface PreviewRepairDraftRow {
  entry: LocalizationTranslationEntry;
  index: number;
}

export interface TranslationImportPreviewRepairIssueDetail {
  action: TranslationImportPreviewEntry["action"];
  index: number;
  key?: string;
  locale?: string;
  message: string;
}

export function createTranslationImportPreviewRepairDraftState(input: {
  defaultLocale: string;
  importText: string;
  preview: TranslationImportPreviewResult;
}): TranslationImportPreviewRepairDraftState {
  const rows = readPreviewRepairDraftRows(input);
  const draft = createTranslationImportDraftFromEntries(
    rows.map((row) => row.entry),
  );
  const keptIndexes = readKeptDraftIndexes(rows, draft.entries);
  const issueDetails = readPreviewRepairIssueDetails({
    defaultLocale: input.defaultLocale,
    keptIndexes,
    preview: input.preview,
  });
  const detailMessage = formatTranslationImportPreviewRepairDraftDetailMessage({
    issueDetails,
    keptIndexes,
  });
  const notice = formatTranslationImportPreviewRepairDraftNotice({
    entryCount: draft.entries.length,
    locale: input.defaultLocale,
  });

  return {
    detailMessage,
    entryCount: draft.entries.length,
    notice: [notice, detailMessage].filter(Boolean).join(" "),
    text: formatTranslationImportDraft(draft),
  };
}

export function formatTranslationImportPreviewRepairDraftNotice(input: {
  entryCount: number;
  locale: string;
}): string {
  return `Draft rebuilt from ${input.entryCount} import preview repair ${input.entryCount === 1 ? "row" : "rows"} for default ${input.locale}. Blocked, duplicate, and error rows are left out; run Preview import again before importing.`;
}

export function formatTranslationImportPreviewRepairDraftDetailMessage(input: {
  issueDetails: TranslationImportPreviewRepairIssueDetail[];
  keptIndexes: number[];
}): string | null {
  if (input.keptIndexes.length === 0 && input.issueDetails.length === 0) {
    return null;
  }

  const keptMessage =
    input.keptIndexes.length > 0
      ? `Repair draft keeps ${formatEntryReferences(input.keptIndexes)}.`
      : "Repair draft has no importable default Locale rows.";
  const issueMessage = formatPreviewRepairIssueDetails(input.issueDetails);

  return [keptMessage, issueMessage].filter(Boolean).join(" ");
}

function readPreviewRepairDraftRows(input: {
  defaultLocale: string;
  importText: string;
  preview: TranslationImportPreviewResult;
}): PreviewRepairDraftRow[] {
  const draftEntries = readDraftEntries(input.importText);
  const repairIndexes = new Set(
    input.preview.entries
      .filter(
        (entry) =>
          (entry.action === "create" || entry.action === "update") &&
          (entry.locale?.trim() ?? input.defaultLocale) === input.defaultLocale,
      )
      .map((entry) => entry.index),
  );

  return draftEntries
    .map((entry, index) =>
      repairIndexes.has(index)
        ? toPreviewRepairDraftRow(entry, index, input.defaultLocale)
        : null,
    )
    .filter((row): row is PreviewRepairDraftRow => Boolean(row));
}

function readDraftEntries(importText: string): unknown[] {
  let parsed: unknown;

  try {
    parsed = JSON.parse(importText);
  } catch {
    return [];
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return [];
  }

  const entries = (parsed as Record<string, unknown>).entries;

  return Array.isArray(entries) ? entries : [];
}

function readDraftTranslationEntry(
  entry: unknown,
  defaultLocale: string,
): LocalizationTranslationEntry | null {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
    return null;
  }

  const record = entry as Record<string, unknown>;
  const key = readRequiredText(record.key);
  const value = readRequiredText(record.value);
  const locale = readOptionalText(record.locale) ?? defaultLocale;

  if (!key || !value || locale !== defaultLocale) {
    return null;
  }

  return {
    context: readOptionalText(record.context),
    key,
    locale,
    value,
  };
}

function toPreviewRepairDraftRow(
  entry: unknown,
  index: number,
  defaultLocale: string,
): PreviewRepairDraftRow | null {
  const translation = readDraftTranslationEntry(entry, defaultLocale);

  return translation ? { entry: translation, index } : null;
}

function readKeptDraftIndexes(
  rows: PreviewRepairDraftRow[],
  draftEntries: TranslationImportDraftEntry[],
): number[] {
  const draftPairs = new Set(
    draftEntries.map((entry) => createTranslationPairKey(entry)),
  );
  const seenPairs = new Set<string>();
  const indexes: number[] = [];

  for (const row of rows) {
    const pair = createTranslationPairKey(row.entry);

    if (!draftPairs.has(pair) || seenPairs.has(pair)) {
      continue;
    }

    seenPairs.add(pair);
    indexes.push(row.index);
  }

  return indexes;
}

function readPreviewRepairIssueDetails(input: {
  defaultLocale: string;
  keptIndexes: number[];
  preview: TranslationImportPreviewResult;
}): TranslationImportPreviewRepairIssueDetail[] {
  const keptIndexes = new Set(input.keptIndexes);

  return input.preview.entries
    .filter((entry) => !keptIndexes.has(entry.index))
    .map((entry) => readPreviewRepairIssueDetail(entry, input.defaultLocale));
}

function readPreviewRepairIssueDetail(
  entry: TranslationImportPreviewEntry,
  defaultLocale: string,
): TranslationImportPreviewRepairIssueDetail {
  return {
    action: entry.action,
    index: entry.index,
    key: readOptionalText(entry.key),
    locale: readOptionalText(entry.locale),
    message: readPreviewRepairIssueMessage(entry, defaultLocale),
  };
}

function readPreviewRepairIssueMessage(
  entry: TranslationImportPreviewEntry,
  defaultLocale: string,
): string {
  const issueMessage = entry.issues
    .map((issue) => issue.message.trim())
    .find(Boolean);

  if (issueMessage) {
    return issueMessage;
  }

  if (
    entry.locale?.trim() &&
    entry.locale.trim() !== defaultLocale &&
    (entry.action === "create" || entry.action === "update")
  ) {
    return "Non-default Locale rows are left out while multi-locale is disabled.";
  }

  return "Draft row could not be rebuilt; check key, locale, and value.";
}

function formatPreviewRepairIssueDetails(
  issueDetails: TranslationImportPreviewRepairIssueDetail[],
): string | null {
  if (issueDetails.length === 0) {
    return null;
  }

  const visibleDetails = issueDetails.slice(0, 3).map(formatIssueDetail);
  const hiddenCount = issueDetails.length - visibleDetails.length;
  const more = hiddenCount > 0 ? `; +${hiddenCount} more` : "";

  return `Skipped rows needing edits: ${visibleDetails.join("; ")}${more}.`;
}

function formatIssueDetail(
  detail: TranslationImportPreviewRepairIssueDetail,
): string {
  const key = detail.key ? ` ${detail.key}` : "";
  const locale = detail.locale ? ` [${detail.locale}]` : "";

  return `entries[${detail.index}]${key}${locale} (${detail.action}: ${detail.message})`;
}

function formatEntryReferences(indexes: number[]): string {
  const references = indexes.map((index) => `entries[${index}]`);

  if (references.length <= 2) {
    return references.join(" and ");
  }

  const lastReference = references[references.length - 1] ?? "";

  return `${references.slice(0, -1).join(", ")}, and ${lastReference}`;
}

function createTranslationPairKey(entry: {
  key: string;
  locale: string;
}): string {
  return `${entry.locale.trim()}:${entry.key.trim()}`;
}

function readRequiredText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readOptionalText(value: unknown): string | undefined {
  const text = typeof value === "string" ? value.trim() : "";

  return text || undefined;
}
