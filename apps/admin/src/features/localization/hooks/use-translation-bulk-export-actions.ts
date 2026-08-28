import { exportTranslations, previewTranslationExport } from "../api";
import { readTranslationBulkActionError } from "../translation-bulk-action-error";
import { downloadTranslationExport } from "../translation-export-file";
import { createTranslationExportSuccessReviewNotice } from "../translation-export-review";
import type { TranslationBulkLoadingAction } from "../translation-bulk-action";
import type {
  LocalizationTranslationsMeta,
  TranslationExportPreviewResult,
  TranslationListFilters,
} from "../types";
import type { TranslationExportReviewNotice } from "../translation-export-review";

type TranslationExportAction = Extract<
  TranslationBulkLoadingAction,
  "download" | "export"
>;

interface TranslationBulkExportFeedback {
  beginExportAction: (action: TranslationExportAction) => void;
  finishAction: () => void;
  showActionError: (message: string) => void;
  showExportDownloadResult: (input: {
    reviewNotice: TranslationExportReviewNotice;
  }) => void;
  showExportPreview: (preview: TranslationExportPreviewResult) => void;
}

export function createTranslationBulkExportActions(input: {
  feedback: TranslationBulkExportFeedback;
  filters: TranslationListFilters;
  meta: Pick<LocalizationTranslationsMeta, "requestedLocale">;
}) {
  return {
    runExportDownload: () => runExportDownload(input),
    runExportPreview: () => runExportPreview(input),
  };
}

async function runExportPreview(input: {
  feedback: TranslationBulkExportFeedback;
  filters: TranslationListFilters;
  meta: Pick<LocalizationTranslationsMeta, "requestedLocale">;
}) {
  input.feedback.beginExportAction("export");

  try {
    input.feedback.showExportPreview(
      await previewTranslationExport(input.filters, input.meta.requestedLocale),
    );
  } catch (caught) {
    input.feedback.showActionError(
      readTranslationBulkActionError("export", caught),
    );
  } finally {
    input.feedback.finishAction();
  }
}

async function runExportDownload(input: {
  feedback: TranslationBulkExportFeedback;
  filters: TranslationListFilters;
  meta: Pick<LocalizationTranslationsMeta, "requestedLocale">;
}) {
  input.feedback.beginExportAction("download");

  try {
    const result = await exportTranslations(
      input.filters,
      input.meta.requestedLocale,
    );

    downloadTranslationExport(result);
    input.feedback.showExportDownloadResult({
      reviewNotice: createTranslationExportSuccessReviewNotice({
        filters: input.filters,
        result,
      }),
    });
  } catch (caught) {
    input.feedback.showActionError(
      readTranslationBulkActionError("download", caught),
    );
  } finally {
    input.feedback.finishAction();
  }
}
