import { readTranslationBulkActionError } from "./translation-bulk-action-error.ts";
import { formatTranslationImportDraftClearSuggestion } from "./translation-import-draft.ts";
import { readTranslationImportErrorDetails } from "./translation-import-error-details.ts";
import { readTranslationImportFocusKey } from "./translation-import-focus.ts";
import {
  formatTranslationBulkRepairCompletionMessage,
  readTranslationBulkRepairCoveredMissingKeys,
} from "./translation-import-result-history.ts";
import {
  createTranslationImportFailureReviewNotice,
  createTranslationImportSuccessReviewNotice,
  type TranslationImportReviewNotice,
} from "./translation-import-review.ts";
import type {
  TranslationImportPreviewResult,
  TranslationImportResult,
} from "./types.ts";

export interface TranslationBulkImportSuccessFeedback {
  draftClearSuggestion: string;
  focusKey: string | null;
  repairCompletionNotice: string | null;
  repairedKeys: string[];
  reviewNotice: TranslationImportReviewNotice;
}

export interface TranslationBulkImportFailureFeedback {
  details: TranslationImportPreviewResult | null;
  message: string;
  reviewNotice: TranslationImportReviewNotice;
}

export function readTranslationBulkImportSuccessFeedback(input: {
  locale: string;
  missingKeys?: string[];
  result: TranslationImportResult;
}): TranslationBulkImportSuccessFeedback {
  const focusKey = readTranslationImportFocusKey(input.result);

  return {
    draftClearSuggestion: formatTranslationImportDraftClearSuggestion({
      importedCount: input.result.summary.importedCount,
    }),
    focusKey,
    repairCompletionNotice: formatTranslationBulkRepairCompletionMessage({
      locale: input.locale,
      missingKeys: input.missingKeys,
      result: input.result,
    }),
    repairedKeys: readTranslationBulkRepairCoveredMissingKeys({
      missingKeys: input.missingKeys,
      result: input.result,
    }),
    reviewNotice: createTranslationImportSuccessReviewNotice({
      focusKey,
      locale: input.locale,
      result: input.result,
    }),
  };
}

export function readTranslationBulkImportFailureFeedback(input: {
  caught: unknown;
  locale: string;
}): TranslationBulkImportFailureFeedback {
  const details = readTranslationImportErrorDetails(input.caught);

  return {
    details,
    message: readTranslationBulkActionError("import", input.caught),
    reviewNotice: createTranslationImportFailureReviewNotice({
      details,
      locale: input.locale,
    }),
  };
}
