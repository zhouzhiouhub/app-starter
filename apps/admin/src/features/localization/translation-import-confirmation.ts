import {
  summarizeTranslationImportTemplate,
  type TranslationImportTemplateSummary,
} from "./translation-import-template-summary.ts";
import type { TranslationImportPreviewResult } from "./types.ts";

export function formatDefaultLocaleImportConfirmationSummary(input: {
  defaultLocale: string;
  importText: string;
  missingKeys?: string[];
  preview?: TranslationImportPreviewResult | null;
}): string {
  const summary = summarizeTranslationImportTemplate({
    defaultLocale: input.defaultLocale,
    importText: input.importText,
    missingKeys: input.missingKeys,
  });

  if (summary.invalidJson) {
    return "Draft is not valid JSON. Import will be blocked until the payload is fixed and previewed.";
  }

  if (summary.invalidEnvelope) {
    return "Draft must contain an entries[] array. Import will be blocked until the payload is fixed and previewed.";
  }

  if (summary.entryCount === 0) {
    return `No rows are queued for default ${input.defaultLocale}. Import will be blocked until entries[] contains at least one row.`;
  }

  const localSummary = formatLocalSummary(summary);

  if (!input.preview) {
    return `${localSummary} Run Preview import before confirming create/update counts.`;
  }

  const previewBlockerCount = readPreviewBlockerCount(input.preview);
  const previewSummary = `Latest preview: ${input.preview.summary.createCount} create, ${input.preview.summary.updateCount} update, ${previewBlockerCount} blocked/duplicate/error.`;

  if (previewBlockerCount > 0) {
    return `${localSummary} ${previewSummary} Fix preview issues before importing default ${input.defaultLocale}.`;
  }

  return `${localSummary} ${previewSummary} Import writes only default ${input.defaultLocale} rows.`;
}

function formatLocalSummary(summary: TranslationImportTemplateSummary): string {
  const blockerCount = readLocalBlockerCount(summary);

  return `Draft summary: ${summary.entryCount} ${formatCountLabel(summary.entryCount, "row")}, ${summary.coveredMissingKeyCount} missing ${formatCountLabel(summary.coveredMissingKeyCount, "key")} covered, ${blockerCount} local ${formatCountLabel(blockerCount, "blocker")}.`;
}

function readLocalBlockerCount(
  summary: TranslationImportTemplateSummary,
): number {
  return (
    summary.blankValueCount +
    summary.duplicateKeyCount +
    summary.invalidKeyCount +
    summary.malformedEntryCount +
    summary.nonDefaultLocaleCount +
    summary.overLimitCount
  );
}

function readPreviewBlockerCount(
  preview: TranslationImportPreviewResult,
): number {
  return (
    preview.summary.blockedCount +
    preview.summary.duplicateCount +
    preview.summary.errorCount
  );
}

function formatCountLabel(count: number, singular: string): string {
  return count === 1 ? singular : `${singular}s`;
}
