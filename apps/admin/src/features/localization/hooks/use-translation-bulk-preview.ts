import { useMemo, useState } from "react";
import {
  exportTranslations,
  importTranslations,
  previewTranslationExport,
  previewTranslationImport,
} from "../api";
import {
  defaultTranslationImportText,
  emptyTranslationImportText,
  formatTranslationImportDraftClearedNotice,
  formatTranslationImportDraftClearSuggestion,
} from "../translation-import-draft";
import {
  createHistoryTranslationImportDraftState,
  createMissingTranslationImportDraftState,
  createResultTranslationImportDraftState,
} from "../translation-import-draft-state";
import { readTranslationImportErrorDetails } from "../translation-import-error-details";
import { downloadTranslationExport } from "../translation-export-file";
import { readTranslationImportFocusKey } from "../translation-import-focus";
import {
  formatTranslationBulkRepairCleanupSuggestion,
  formatTranslationBulkRepairCompletionMessage,
  formatTranslationImportHistoryReplayMessage,
  readTranslationBulkRepairCoveredMissingKeys,
  type TranslationImportResultHistoryEntry,
} from "../translation-import-result-history";
import { readTranslationBulkActionError } from "../translation-bulk-action-error";
import { useTranslationBulkRepairConfirmation } from "./use-translation-bulk-repair-confirmation";
import { useTranslationImportResultHistory } from "./use-translation-import-result-history";
import type { TranslationBulkLoadingAction } from "../translation-bulk-action";
import type {
  LocalizationTranslationsMeta,
  TranslationExportPreviewResult,
  TranslationImportPreviewResult,
  TranslationImportResult,
  TranslationImportResultEntry,
  TranslationListFilters,
} from "../types";

export function useTranslationBulkPreview(input: {
  filters: TranslationListFilters;
  meta: LocalizationTranslationsMeta;
  missingKeys?: string[];
  onImported?: (result: TranslationImportResult) => Promise<void> | void;
}) {
  const [importText, setImportText] = useState(defaultTranslationImportText);
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
  const importResultHistoryState = useTranslationImportResultHistory();
  const missingKeyDraftState = useMemo(
    () =>
      createMissingTranslationImportDraftState({
        keys: input.missingKeys ?? [],
        locale: input.meta.locale,
      }),
    [input.meta.locale, input.missingKeys],
  );
  const repairConfirmation = useTranslationBulkRepairConfirmation({
    locale: input.meta.locale,
    missingKeys: input.missingKeys,
    requestId: input.meta.requestId,
  });

  function useMissingKeyDraft() {
    useImportDraft(missingKeyDraftState.text, missingKeyDraftState.notice);
  }

  function useResultDraft(entries: TranslationImportResultEntry[]) {
    const draftState = createResultTranslationImportDraftState(entries);

    useImportDraft(draftState.text, draftState.notice);
  }

  function useHistoryDraft(entry: TranslationImportResultHistoryEntry) {
    const draftState = createHistoryTranslationImportDraftState(entry);

    useImportDraft(draftState.text, draftState.notice);
  }

  function useImportDraft(text: string, notice: string) {
    setError(null);
    setExportPreview(null);
    setImportErrorDetails(null);
    setImportPreview(null);
    setImportResult(null);
    setDraftNotice(notice);
    setDraftClearSuggestion(null);
    setHistoryReplayNotice(null);
    setRepairCompletionNotice(null);
    repairConfirmation.clear();
    setImportText(text);
  }

  function handleImportTextChange(value: string) {
    setDraftNotice(null);
    setDraftClearSuggestion(null);
    setHistoryReplayNotice(null);
    setImportText(value);
  }

  const runImportPreview = async () => {
    setLoadingAction("preview-import");
    setError(null);
    setImportErrorDetails(null);
    setImportResult(null);
    setDraftNotice(null);
    setDraftClearSuggestion(null);
    setHistoryReplayNotice(null);
    setRepairCompletionNotice(null);
    repairConfirmation.clear();

    try {
      setImportPreview(await previewTranslationImport(JSON.parse(importText)));
    } catch (caught) {
      setError(readTranslationBulkActionError("preview-import", caught));
    } finally {
      setLoadingAction(null);
    }
  };
  const runImport = async () => {
    setLoadingAction("import");
    setError(null);
    setImportErrorDetails(null);
    setImportResult(null);
    setDraftNotice(null);
    setDraftClearSuggestion(null);
    setHistoryReplayNotice(null);
    setRepairCompletionNotice(null);
    repairConfirmation.clear();

    try {
      const result = await importTranslations(JSON.parse(importText));
      setImportResult(result);
      importResultHistoryState.recordImportResult(result);
      const repairedKeys = readTranslationBulkRepairCoveredMissingKeys({
        missingKeys: input.missingKeys,
        result,
      });
      setRepairCompletionNotice(
        formatTranslationBulkRepairCompletionMessage({
          locale: input.meta.locale,
          missingKeys: input.missingKeys,
          result,
        }),
      );
      setDraftClearSuggestion(
        formatTranslationImportDraftClearSuggestion({
          importedCount: result.summary.importedCount,
        }),
      );
      await input.onImported?.(result);
      repairConfirmation.begin(repairedKeys, result.entries[0]?.key ?? null);
    } catch (caught) {
      setError(readTranslationBulkActionError("import", caught));
      setImportErrorDetails(readTranslationImportErrorDetails(caught));
    } finally {
      setLoadingAction(null);
    }
  };
  const runExportPreview = async () => {
    setLoadingAction("export");
    setError(null);
    setImportErrorDetails(null);
    setDraftClearSuggestion(null);
    setHistoryReplayNotice(null);

    try {
      setExportPreview(
        await previewTranslationExport(
          input.filters,
          input.meta.requestedLocale,
        ),
      );
    } catch (caught) {
      setError(readTranslationBulkActionError("export", caught));
    } finally {
      setLoadingAction(null);
    }
  };
  const runExportDownload = async () => {
    setLoadingAction("download");
    setError(null);
    setImportErrorDetails(null);
    setDraftClearSuggestion(null);
    setHistoryReplayNotice(null);

    try {
      downloadTranslationExport(
        await exportTranslations(input.filters, input.meta.requestedLocale),
      );
    } catch (caught) {
      setError(readTranslationBulkActionError("download", caught));
    } finally {
      setLoadingAction(null);
    }
  };

  function restoreImportResult(entry: TranslationImportResultHistoryEntry) {
    const focusKey = readTranslationImportFocusKey(entry.result);

    setError(null);
    setExportPreview(null);
    setImportErrorDetails(null);
    setImportPreview(null);
    setImportResult(entry.result);
    setDraftNotice(null);
    setDraftClearSuggestion(null);
    setHistoryReplayNotice(
      formatTranslationImportHistoryReplayMessage(entry, { focusKey }),
    );
    setRepairCompletionNotice(null);
    repairConfirmation.clear();

    return focusKey;
  }

  function clearImportDraftAfterSuccess() {
    setError(null);
    setExportPreview(null);
    setImportErrorDetails(null);
    setImportPreview(null);
    setDraftNotice(
      formatTranslationImportDraftClearedNotice({
        locale: input.meta.locale,
      }),
    );
    setDraftClearSuggestion(null);
    setHistoryReplayNotice(null);
    setImportText(emptyTranslationImportText);
  }

  return {
    clearImportDraftAfterSuccess,
    clearImportResultHistory: importResultHistoryState.clearImportResultHistory,
    draftClearSuggestion,
    draftNotice,
    error,
    exportPreview,
    hasMissingKeyDraft: missingKeyDraftState.entryCount > 0,
    historyReplayNotice,
    importErrorDetails,
    importPreview,
    importResult,
    importResultHistory: importResultHistoryState.importResultHistory,
    importText,
    loadingAction,
    repairCleanupSuggestion:
      repairConfirmation.notice?.type === "success"
        ? formatTranslationBulkRepairCleanupSuggestion({
            historyCount: importResultHistoryState.importResultHistory.length,
          })
        : null,
    repairCompletionNotice,
    repairServerNotice: repairConfirmation.notice,
    restoreImportResult,
    runExportDownload,
    runExportPreview,
    runImport,
    runImportPreview,
    useMissingKeyDraft,
    useResultDraft,
    useHistoryDraft,
    handleImportTextChange,
  };
}
