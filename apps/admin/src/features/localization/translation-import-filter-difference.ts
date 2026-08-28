import { translationKeyPattern } from "@app-starter/schema";
import type {
  TranslationImportPreviewResult,
  TranslationListFilters,
} from "./types.ts";

export interface TranslationImportPreviewFilterDifference {
  count: number;
  firstKey: string;
  message: string;
}

export function formatTranslationImportFilterDifferenceMessage(input: {
  importText: string;
  namespace?: string;
  query?: string;
}): string | null {
  const filters = readActiveFilterLabels(input);

  if (filters.length === 0) {
    return null;
  }

  const parsed = readImportTemplateEntries(input.importText);

  if (!parsed.ok) {
    return null;
  }

  const outsideFilterCount = parsed.entries.filter(
    (entry) => !matchesTranslationFilters(entry, input),
  ).length;

  if (outsideFilterCount === 0) {
    return null;
  }

  return `${outsideFilterCount} draft ${outsideFilterCount === 1 ? "row is" : "rows are"} outside current translation filters (${filters.join(", ")}). Import still writes default Locale rows, but the table may hide them until filters are cleared.`;
}

export function readTranslationImportPreviewFilterDifference(input: {
  filters?: TranslationListFilters;
  preview: TranslationImportPreviewResult;
}): TranslationImportPreviewFilterDifference | null {
  const filters = readActiveFilterLabels(input.filters ?? {});

  if (filters.length === 0) {
    return null;
  }

  const outsideKeys = readPreviewFilterDifferenceKeys(input);

  if (outsideKeys.length === 0) {
    return null;
  }

  const firstKey = outsideKeys[0];

  if (!firstKey) {
    return null;
  }

  return {
    count: outsideKeys.length,
    firstKey,
    message: `${outsideKeys.length} preview row ${outsideKeys.length === 1 ? "key is" : "keys are"} outside current translation filters (${filters.join(", ")}). Focus ${firstKey} to prepare the table filters before importing or reviewing the saved row.`,
  };
}

function readImportTemplateEntries(
  importText: string,
):
  | { entries: unknown[]; ok: true }
  | { ok: false; reason: "invalid-envelope" | "invalid-json" } {
  let parsed: unknown;

  try {
    parsed = JSON.parse(importText);
  } catch {
    return { ok: false, reason: "invalid-json" };
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { ok: false, reason: "invalid-envelope" };
  }

  const entries = (parsed as Record<string, unknown>).entries;

  if (!Array.isArray(entries)) {
    return { ok: false, reason: "invalid-envelope" };
  }

  return { entries, ok: true };
}

function readPreviewFilterDifferenceKeys(input: {
  filters?: TranslationListFilters;
  preview: TranslationImportPreviewResult;
}): string[] {
  const seenKeys = new Set<string>();
  const outsideKeys: string[] = [];

  for (const entry of input.preview.entries) {
    const key = entry.key?.trim() ?? "";

    if (
      !translationKeyPattern.test(key) ||
      seenKeys.has(key) ||
      matchesPreviewKeyFilters(key, input.filters ?? {})
    ) {
      continue;
    }

    seenKeys.add(key);
    outsideKeys.push(key);
  }

  return outsideKeys;
}

function matchesTranslationFilters(
  entry: unknown,
  filters: { namespace?: string; query?: string },
): boolean {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
    return true;
  }

  const record = entry as Record<string, unknown>;
  const key = readFilterableText(record.key);

  if (filters.namespace?.trim() && !matchesNamespace(key, filters.namespace)) {
    return false;
  }

  const query = filters.query?.trim();

  if (!query) {
    return true;
  }

  return [
    key,
    readFilterableText(record.value),
    readFilterableText(record.context),
  ]
    .filter(Boolean)
    .some((value) => value.includes(query));
}

function matchesNamespace(key: string, namespace: string | undefined): boolean {
  const normalizedNamespace = namespace?.trim();

  if (!normalizedNamespace) {
    return true;
  }

  return (
    key === normalizedNamespace || key.startsWith(`${normalizedNamespace}.`)
  );
}

function readActiveFilterLabels(input: {
  namespace?: string;
  query?: string;
}): string[] {
  return [
    formatFilterLabel("namespace", input.namespace),
    formatFilterLabel("q", input.query),
  ].filter((label): label is string => Boolean(label));
}

function formatFilterLabel(label: string, value: string | undefined) {
  const text = value?.trim();

  return text ? `${label}=${text}` : null;
}

function matchesPreviewKeyFilters(
  key: string,
  filters: { namespace?: string; query?: string },
): boolean {
  if (filters.namespace?.trim() && !matchesNamespace(key, filters.namespace)) {
    return false;
  }

  const query = filters.query?.trim();

  return query ? key.includes(query) : true;
}

function readFilterableText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}
