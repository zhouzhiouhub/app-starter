import type {
  TranslationImportPreviewResult,
  TranslationImportResult,
} from "./types.ts";

export interface TranslationImportReviewNotice {
  message: string;
  type: "error" | "success";
}

export function createTranslationImportSuccessReviewNotice(input: {
  focusKey?: string | null;
  locale: string;
  result: TranslationImportResult;
}): TranslationImportReviewNotice {
  const focusMessage = input.focusKey
    ? ` Review ${input.focusKey} in the translations table, then refresh missing keys if this import was a repair.`
    : " Refresh missing keys if this import was a repair.";

  return {
    message: `Import review: ${input.result.summary.importedCount} default ${input.locale} ${formatCountLabel(input.result.summary.importedCount, "row")} saved (${input.result.summary.createdCount} created, ${input.result.summary.updatedCount} updated).${focusMessage}`,
    type: "success",
  };
}

export function createTranslationImportFailureReviewNotice(input: {
  details?: TranslationImportPreviewResult | null;
  locale: string;
}): TranslationImportReviewNotice {
  const blockedCount = input.details
    ? readPreviewBlockedCount(input.details)
    : 0;
  const issueMessage = input.details
    ? readFirstIssueMessage(input.details)
    : null;

  if (blockedCount > 0) {
    return {
      message: `Import review: no default ${input.locale} rows were saved. ${blockedCount} preview ${formatCountLabel(blockedCount, "row")} need repair before retrying${issueMessage ? `; first issue: ${issueMessage}` : "."}`,
      type: "error",
    };
  }

  return {
    message: `Import review: no default ${input.locale} rows were saved. Check the error, update the draft, and run Preview import before retrying.`,
    type: "error",
  };
}

function readPreviewBlockedCount(preview: TranslationImportPreviewResult) {
  return (
    preview.summary.blockedCount +
    preview.summary.duplicateCount +
    preview.summary.errorCount
  );
}

function readFirstIssueMessage(
  preview: TranslationImportPreviewResult,
): string | null {
  const message = preview.entries
    .flatMap((entry) => entry.issues)
    .find((issue) => issue.message.trim())?.message;

  return message?.trim() ?? null;
}

function formatCountLabel(count: number, singular: string): string {
  return count === 1 ? singular : `${singular}s`;
}
