import { useState } from "react";
import type { TranslationBulkLoadingAction } from "../translation-bulk-action";
import type {
  TranslationExportPreviewResult,
  TranslationImportPreviewResult,
  TranslationImportResult,
} from "../types";

type TranslationImportAction = Extract<
  TranslationBulkLoadingAction,
  "import" | "preview-import"
>;

type TranslationExportAction = Extract<
  TranslationBulkLoadingAction,
  "download" | "export"
>;

export function useTranslationBulkPreviewFeedback() {
  const [importPreview, setImportPreview] =
    useState<TranslationImportPreviewResult | null>(null);
  const [importResult, setImportResult] =
    useState<TranslationImportResult | null>(null);
  const [importErrorDetails, setImportErrorDetails] =
    useState<TranslationImportPreviewResult | null>(null);
  const [exportPreview, setExportPreview] =
    useState<TranslationExportPreviewResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draftNotice, setDraftNotice] = useState<string | null>(null);
  const [draftClearSuggestion, setDraftClearSuggestion] = useState<
    string | null
  >(null);
  const [historyReplayNotice, setHistoryReplayNotice] = useState<string | null>(
    null,
  );
  const [repairCompletionNotice, setRepairCompletionNotice] = useState<
    string | null
  >(null);
  const [loadingAction, setLoadingAction] =
    useState<TranslationBulkLoadingAction | null>(null);

  function applyImportDraft(notice: string) {
    clearVisibleResults();
    setDraftNotice(notice);
    setDraftClearSuggestion(null);
    setHistoryReplayNotice(null);
    setRepairCompletionNotice(null);
  }

  function beginImportAction(action: TranslationImportAction) {
    setLoadingAction(action);
    setError(null);
    setImportErrorDetails(null);
    setImportResult(null);
    setDraftNotice(null);
    setDraftClearSuggestion(null);
    setHistoryReplayNotice(null);
    setRepairCompletionNotice(null);
  }

  function beginExportAction(action: TranslationExportAction) {
    setLoadingAction(action);
    setError(null);
    setImportErrorDetails(null);
    setDraftClearSuggestion(null);
    setHistoryReplayNotice(null);
  }

  function clearHistoryReplayAfterConfirmation() {
    clearImportResultHistoryFeedback();
    setError(null);
    setExportPreview(null);
    setImportErrorDetails(null);
    setImportPreview(null);
    setDraftClearSuggestion(null);
    setRepairCompletionNotice(null);
  }

  function clearImportDraftAfterSuccess(notice: string) {
    setError(null);
    setExportPreview(null);
    setImportErrorDetails(null);
    setImportPreview(null);
    setDraftNotice(notice);
    setDraftClearSuggestion(null);
    setHistoryReplayNotice(null);
  }

  function clearImportResultHistoryFeedback() {
    if (historyReplayNotice) {
      setHistoryReplayNotice(null);
      setImportResult(null);
    }
  }

  function clearTextChangeFeedback() {
    setDraftNotice(null);
    setDraftClearSuggestion(null);
    setHistoryReplayNotice(null);
    setImportPreview(null);
  }

  function finishAction() {
    setLoadingAction(null);
  }

  function showActionError(message: string) {
    setError(message);
  }

  function showDraftActionGuard(message: string) {
    clearVisibleResults();
    setDraftNotice(message);
    setDraftClearSuggestion(null);
    setHistoryReplayNotice(null);
    setRepairCompletionNotice(null);
  }

  function showExportPreview(preview: TranslationExportPreviewResult) {
    setExportPreview(preview);
  }

  function showHistoryReplay(input: {
    notice: string;
    result: TranslationImportResult;
  }) {
    setError(null);
    setExportPreview(null);
    setImportErrorDetails(null);
    setImportPreview(null);
    setImportResult(input.result);
    setDraftNotice(null);
    setDraftClearSuggestion(null);
    setHistoryReplayNotice(input.notice);
    setRepairCompletionNotice(null);
  }

  function showImportError(
    message: string,
    details: TranslationImportPreviewResult | null,
  ) {
    setError(message);
    setImportErrorDetails(details);
  }

  function showImportPreview(preview: TranslationImportPreviewResult) {
    setImportPreview(preview);
  }

  function showImportResult(input: {
    draftClearSuggestion: string;
    repairCompletionNotice: string | null;
    result: TranslationImportResult;
  }) {
    setImportResult(input.result);
    setRepairCompletionNotice(input.repairCompletionNotice);
    setDraftClearSuggestion(input.draftClearSuggestion);
  }

  function clearVisibleResults() {
    setError(null);
    setExportPreview(null);
    setImportErrorDetails(null);
    setImportPreview(null);
    setImportResult(null);
  }

  return {
    applyImportDraft,
    beginExportAction,
    beginImportAction,
    clearHistoryReplayAfterConfirmation,
    clearImportDraftAfterSuccess,
    clearImportResultHistoryFeedback,
    clearTextChangeFeedback,
    draftClearSuggestion,
    draftNotice,
    error,
    exportPreview,
    finishAction,
    historyReplayNotice,
    importErrorDetails,
    importPreview,
    importResult,
    loadingAction,
    repairCompletionNotice,
    showActionError,
    showDraftActionGuard,
    showExportPreview,
    showHistoryReplay,
    showImportError,
    showImportPreview,
    showImportResult,
  };
}
