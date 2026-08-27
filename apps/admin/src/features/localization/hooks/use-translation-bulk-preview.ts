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
  formatTranslationImportHistoryReplayCleanupSuggestion,
  formatTranslationImportHistoryReplayMessage,
  readTranslationBulkRepairCoveredMissingKeys,
  type TranslationImportResultHistoryEntry,
} from "../translation-import-result-history";
import { readTranslationBulkActionError } from "../translation-bulk-action-error";
import { readTranslationImportDraftActionGuard } from "../translation-import-action-guard";
import { useTranslationBulkPreviewFeedback } from "./use-translation-bulk-preview-feedback";
import { useTranslationBulkRepairConfirmation } from "./use-translation-bulk-repair-confirmation";
import { useTranslationImportResultHistory } from "./use-translation-import-result-history";
import type { TranslationBulkLoadingAction } from "../translation-bulk-action";
import type {
  LocalizationTranslationsMeta,
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
  const feedback = useTranslationBulkPreviewFeedback();
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
    feedback.applyImportDraft(notice);
    repairConfirmation.clear();
    setImportText(text);
  }

  function handleImportTextChange(value: string) {
    feedback.clearTextChangeFeedback();
    setImportText(value);
  }

  const runImportPreview = async () => {
    if (guardImportDraftAction("preview-import")) {
      return;
    }

    feedback.beginImportAction("preview-import");
    repairConfirmation.clear();

    try {
      feedback.showImportPreview(
        await previewTranslationImport(JSON.parse(importText)),
      );
    } catch (caught) {
      feedback.showActionError(
        readTranslationBulkActionError("preview-import", caught),
      );
    } finally {
      feedback.finishAction();
    }
  };
  const runImport = async () => {
    if (guardImportDraftAction("import")) {
      return;
    }

    feedback.beginImportAction("import");
    repairConfirmation.clear();

    try {
      const result = await importTranslations(JSON.parse(importText));
      importResultHistoryState.recordImportResult(result);
      const repairedKeys = readTranslationBulkRepairCoveredMissingKeys({
        missingKeys: input.missingKeys,
        result,
      });
      feedback.showImportResult({
        draftClearSuggestion: formatTranslationImportDraftClearSuggestion({
          importedCount: result.summary.importedCount,
        }),
        repairCompletionNotice: formatTranslationBulkRepairCompletionMessage({
          locale: input.meta.locale,
          missingKeys: input.missingKeys,
          result,
        }),
        result,
      });
      await input.onImported?.(result);
      repairConfirmation.begin(repairedKeys, result.entries[0]?.key ?? null);
    } catch (caught) {
      feedback.showImportError(
        readTranslationBulkActionError("import", caught),
        readTranslationImportErrorDetails(caught),
      );
    } finally {
      feedback.finishAction();
    }
  };
  const runExportPreview = async () => {
    feedback.beginExportAction("export");

    try {
      feedback.showExportPreview(
        await previewTranslationExport(
          input.filters,
          input.meta.requestedLocale,
        ),
      );
    } catch (caught) {
      feedback.showActionError(
        readTranslationBulkActionError("export", caught),
      );
    } finally {
      feedback.finishAction();
    }
  };
  const runExportDownload = async () => {
    feedback.beginExportAction("download");

    try {
      downloadTranslationExport(
        await exportTranslations(input.filters, input.meta.requestedLocale),
      );
    } catch (caught) {
      feedback.showActionError(
        readTranslationBulkActionError("download", caught),
      );
    } finally {
      feedback.finishAction();
    }
  };

  function restoreImportResult(entry: TranslationImportResultHistoryEntry) {
    const focusKey = readTranslationImportFocusKey(entry.result);

    feedback.showHistoryReplay({
      notice: formatTranslationImportHistoryReplayMessage(entry, { focusKey }),
      result: entry.result,
    });
    repairConfirmation.clear();

    return focusKey;
  }

  function clearImportDraftAfterSuccess() {
    feedback.clearImportDraftAfterSuccess(
      formatTranslationImportDraftClearedNotice({
        locale: input.meta.locale,
      }),
    );
    setImportText(emptyTranslationImportText);
  }

  function clearImportResultHistory() {
    importResultHistoryState.clearImportResultHistory();
    feedback.clearImportResultHistoryFeedback();
  }

  function clearHistoryReplayAfterConfirmation() {
    importResultHistoryState.clearImportResultHistory();
    feedback.clearHistoryReplayAfterConfirmation();
    repairConfirmation.clear();
  }

  function guardImportDraftAction(
    action: Extract<TranslationBulkLoadingAction, "import" | "preview-import">,
  ): boolean {
    const message = readTranslationImportDraftActionGuard({
      action,
      defaultLocale: input.meta.locale,
      importText,
      missingKeys: input.missingKeys,
    });

    if (!message) {
      return false;
    }

    feedback.showDraftActionGuard(message);
    repairConfirmation.clear();

    return true;
  }

  return {
    clearImportDraftAfterSuccess,
    clearHistoryReplayAfterConfirmation,
    clearImportResultHistory,
    draftClearSuggestion: feedback.draftClearSuggestion,
    draftNotice: feedback.draftNotice,
    error: feedback.error,
    exportPreview: feedback.exportPreview,
    hasMissingKeyDraft: missingKeyDraftState.entryCount > 0,
    historyReplayNotice: feedback.historyReplayNotice,
    historyReplayCleanupSuggestion: feedback.historyReplayNotice
      ? formatTranslationImportHistoryReplayCleanupSuggestion({
          historyCount: importResultHistoryState.importResultHistory.length,
        })
      : null,
    importErrorDetails: feedback.importErrorDetails,
    importPreview: feedback.importPreview,
    importResult: feedback.importResult,
    importResultHistory: importResultHistoryState.importResultHistory,
    importText,
    loadingAction: feedback.loadingAction,
    repairCleanupSuggestion:
      repairConfirmation.notice?.type === "success"
        ? formatTranslationBulkRepairCleanupSuggestion({
            historyCount: importResultHistoryState.importResultHistory.length,
          })
        : null,
    repairCompletionNotice: feedback.repairCompletionNotice,
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
