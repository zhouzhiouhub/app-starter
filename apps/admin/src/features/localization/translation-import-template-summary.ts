import {
  translationBulkPreviewMaxEntries,
  translationKeyPattern,
} from "@app-starter/schema";

export interface TranslationImportTemplateSummary {
  blankValueCount: number;
  coveredMissingKeyCount: number;
  duplicateKeyCount: number;
  entryCount: number;
  invalidEnvelope: boolean;
  invalidJson: boolean;
  invalidKeyCount: number;
  malformedEntryCount: number;
  nonDefaultLocaleCount: number;
  overLimitCount: number;
  remainingMissingKeyCount: number;
}

export type TranslationImportTemplateSeverity =
  "error" | "info" | "success" | "warning";

interface TranslationImportTemplateLocalCounts {
  blankValueCount: number;
  invalidKeyCount: number;
  malformedEntryCount: number;
  nonDefaultLocaleCount: number;
}

export function summarizeTranslationImportTemplate(input: {
  defaultLocale: string;
  importText: string;
  missingKeys?: string[];
}): TranslationImportTemplateSummary {
  const parsed = readImportTemplateEntries(input.importText);

  if (!parsed.ok) {
    return createEmptySummary({
      invalidEnvelope: parsed.reason === "invalid-envelope",
      invalidJson: parsed.reason === "invalid-json",
      missingKeyCount: readMissingKeySet(input.missingKeys).size,
    });
  }

  return summarizeEntries({
    defaultLocale: input.defaultLocale,
    entries: parsed.entries,
    missingKeys: readMissingKeySet(input.missingKeys),
  });
}

export function readTranslationImportTemplateSeverity(
  summary: TranslationImportTemplateSummary,
): TranslationImportTemplateSeverity {
  if (summary.invalidJson || summary.invalidEnvelope) {
    return "error";
  }

  if (
    summary.blankValueCount > 0 ||
    summary.duplicateKeyCount > 0 ||
    summary.invalidKeyCount > 0 ||
    summary.malformedEntryCount > 0 ||
    summary.nonDefaultLocaleCount > 0 ||
    summary.overLimitCount > 0
  ) {
    return "warning";
  }

  if (summary.entryCount > 0) {
    return "success";
  }

  return "info";
}

export function readTranslationImportTemplateEmptyStateMessage(input: {
  defaultLocale: string;
  summary: TranslationImportTemplateSummary;
}): string | null {
  if (
    input.summary.invalidJson ||
    input.summary.invalidEnvelope ||
    input.summary.entryCount > 0
  ) {
    return null;
  }

  return `No import rows are queued for default ${input.defaultLocale}. Add at least one entries[] item before previewing or importing.`;
}

function summarizeEntries(input: {
  defaultLocale: string;
  entries: unknown[];
  missingKeys: Set<string>;
}): TranslationImportTemplateSummary {
  const seenKeys = new Set<string>();
  const duplicateKeys = new Set<string>();
  const coveredMissingKeys = new Set<string>();

  const counts = input.entries.reduce<TranslationImportTemplateLocalCounts>(
    (summary, entry) => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
        summary.malformedEntryCount += 1;
        return summary;
      }

      const record = entry as Record<string, unknown>;
      const key = typeof record.key === "string" ? record.key.trim() : "";
      const locale =
        typeof record.locale === "string" && record.locale.trim()
          ? record.locale.trim()
          : input.defaultLocale;
      const pairKey = `${locale}:${key}`;

      if (!key || !translationKeyPattern.test(key)) {
        summary.invalidKeyCount += 1;
      } else if (input.missingKeys.has(key)) {
        coveredMissingKeys.add(key);
      }

      if (key && translationKeyPattern.test(key)) {
        if (seenKeys.has(pairKey)) {
          duplicateKeys.add(pairKey);
        }
        seenKeys.add(pairKey);
      }

      if (
        typeof record.value !== "string" ||
        record.value.trim().length === 0
      ) {
        summary.blankValueCount += 1;
      }

      if (locale !== input.defaultLocale) {
        summary.nonDefaultLocaleCount += 1;
      }

      return summary;
    },
    {
      blankValueCount: 0,
      invalidKeyCount: 0,
      malformedEntryCount: 0,
      nonDefaultLocaleCount: 0,
    },
  );

  return {
    ...counts,
    coveredMissingKeyCount: coveredMissingKeys.size,
    duplicateKeyCount: duplicateKeys.size,
    entryCount: input.entries.length,
    invalidEnvelope: false,
    invalidJson: false,
    overLimitCount: Math.max(
      0,
      input.entries.length - translationBulkPreviewMaxEntries,
    ),
    remainingMissingKeyCount: Math.max(
      0,
      input.missingKeys.size - coveredMissingKeys.size,
    ),
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

function readMissingKeySet(missingKeys?: string[]): Set<string> {
  return new Set(
    (missingKeys ?? [])
      .map((key) => key.trim())
      .filter((key) => translationKeyPattern.test(key)),
  );
}

function createEmptySummary(input: {
  invalidEnvelope: boolean;
  invalidJson: boolean;
  missingKeyCount: number;
}): TranslationImportTemplateSummary {
  return {
    blankValueCount: 0,
    coveredMissingKeyCount: 0,
    duplicateKeyCount: 0,
    entryCount: 0,
    invalidEnvelope: input.invalidEnvelope,
    invalidJson: input.invalidJson,
    invalidKeyCount: 0,
    malformedEntryCount: 0,
    nonDefaultLocaleCount: 0,
    overLimitCount: 0,
    remainingMissingKeyCount: input.missingKeyCount,
  };
}
