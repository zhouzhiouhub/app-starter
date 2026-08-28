import {
  createTranslationImportDraftFromEntries,
  formatTranslationImportDraft,
} from "./translation-import-draft.ts";
import type {
  LocalizationTranslationEntry,
  TranslationImportPreviewResult,
} from "./types.ts";

export interface TranslationImportPreviewRepairDraftState {
  entryCount: number;
  notice: string;
  text: string;
}

export function createTranslationImportPreviewRepairDraftState(input: {
  defaultLocale: string;
  importText: string;
  preview: TranslationImportPreviewResult;
}): TranslationImportPreviewRepairDraftState {
  const draft = createTranslationImportDraftFromEntries(
    readPreviewRepairDraftEntries(input),
  );

  return {
    entryCount: draft.entries.length,
    notice: formatTranslationImportPreviewRepairDraftNotice({
      entryCount: draft.entries.length,
      locale: input.defaultLocale,
    }),
    text: formatTranslationImportDraft(draft),
  };
}

export function formatTranslationImportPreviewRepairDraftNotice(input: {
  entryCount: number;
  locale: string;
}): string {
  return `Draft rebuilt from ${input.entryCount} import preview repair ${input.entryCount === 1 ? "row" : "rows"} for default ${input.locale}. Blocked, duplicate, and error rows are left out; run Preview import again before importing.`;
}

function readPreviewRepairDraftEntries(input: {
  defaultLocale: string;
  importText: string;
  preview: TranslationImportPreviewResult;
}): LocalizationTranslationEntry[] {
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
        ? readDraftTranslationEntry(entry, input.defaultLocale)
        : null,
    )
    .filter((entry): entry is LocalizationTranslationEntry => Boolean(entry));
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

function readRequiredText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readOptionalText(value: unknown): string | undefined {
  const text = typeof value === "string" ? value.trim() : "";

  return text || undefined;
}
