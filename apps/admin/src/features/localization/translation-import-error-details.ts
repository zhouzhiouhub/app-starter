import { ApiRequestError } from "../../lib/api-error.ts";
import type {
  TranslationImportPreviewAction,
  TranslationImportPreviewEntry,
  TranslationImportPreviewResult,
  TranslationImportPreviewSummary,
  TranslationPreviewIssue,
} from "./types.ts";

const importPreviewActions = new Set<TranslationImportPreviewAction>([
  "blocked",
  "create",
  "duplicate",
  "error",
  "update",
]);

export function readTranslationImportErrorDetails(
  error: unknown,
): TranslationImportPreviewResult | null {
  if (!(error instanceof ApiRequestError)) {
    return null;
  }

  return readImportErrorDetails(error.details);
}

function readImportErrorDetails(
  details: unknown,
): TranslationImportPreviewResult | null {
  if (!details || typeof details !== "object") {
    return null;
  }

  const record = details as { entries?: unknown; summary?: unknown };
  const entries = readImportErrorEntries(record.entries);

  if (entries.length === 0) {
    return null;
  }

  return {
    entries,
    summary:
      readImportErrorSummary(record.summary) ??
      createSummaryFromEntries(entries),
  };
}

function readImportErrorEntries(
  value: unknown,
): TranslationImportPreviewEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map(readImportErrorEntry)
    .filter((entry): entry is TranslationImportPreviewEntry => Boolean(entry));
}

function readImportErrorEntry(
  value: unknown,
): TranslationImportPreviewEntry | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const action = readImportAction(record.action);
  const index = readNonNegativeInteger(record.index);
  const issues = readImportIssues(record.issues);
  const key = readNonEmptyString(record.key);
  const locale = readNonEmptyString(record.locale);

  if (!action || index === null || issues.length === 0) {
    return null;
  }

  return {
    action,
    index,
    issues,
    ...(key ? { key } : {}),
    ...(locale ? { locale } : {}),
  };
}

function readImportIssues(value: unknown): TranslationPreviewIssue[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map(readImportIssue)
    .filter((issue): issue is TranslationPreviewIssue => Boolean(issue));
}

function readImportIssue(value: unknown): TranslationPreviewIssue | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const code = readNonEmptyString(record.code);
  const field = readNonEmptyString(record.field);
  const message = readNonEmptyString(record.message);

  if (!code || !message) {
    return null;
  }

  return {
    code,
    message,
    ...(field ? { field } : {}),
  };
}

function readImportErrorSummary(
  value: unknown,
): TranslationImportPreviewSummary | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const summary = {
    blockedCount: readNonNegativeInteger(record.blockedCount),
    createCount: readNonNegativeInteger(record.createCount),
    duplicateCount: readNonNegativeInteger(record.duplicateCount),
    errorCount: readNonNegativeInteger(record.errorCount),
    totalEntries: readNonNegativeInteger(record.totalEntries),
    updateCount: readNonNegativeInteger(record.updateCount),
  };

  if (Object.values(summary).some((count) => count === null)) {
    return null;
  }

  return summary as TranslationImportPreviewSummary;
}

function createSummaryFromEntries(
  entries: TranslationImportPreviewEntry[],
): TranslationImportPreviewSummary {
  return entries.reduce<TranslationImportPreviewSummary>(
    (summary, entry) => ({
      blockedCount: summary.blockedCount + (entry.action === "blocked" ? 1 : 0),
      createCount: summary.createCount + (entry.action === "create" ? 1 : 0),
      duplicateCount:
        summary.duplicateCount + (entry.action === "duplicate" ? 1 : 0),
      errorCount: summary.errorCount + (entry.action === "error" ? 1 : 0),
      totalEntries: summary.totalEntries + 1,
      updateCount: summary.updateCount + (entry.action === "update" ? 1 : 0),
    }),
    {
      blockedCount: 0,
      createCount: 0,
      duplicateCount: 0,
      errorCount: 0,
      totalEntries: 0,
      updateCount: 0,
    },
  );
}

function readImportAction(
  value: unknown,
): TranslationImportPreviewAction | null {
  return typeof value === "string" &&
    importPreviewActions.has(value as TranslationImportPreviewAction)
    ? (value as TranslationImportPreviewAction)
    : null;
}

function readNonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function readNonNegativeInteger(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= 0
    ? value
    : null;
}
