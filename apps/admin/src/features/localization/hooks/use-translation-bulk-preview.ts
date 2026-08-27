import { useMemo, useRef, useState } from "react";
import {
  exportTranslations,
  importTranslations,
  previewTranslationExport,
  previewTranslationImport,
} from "../api";
import { formatRequestError } from "../../../lib/api-error";
import {
  createMissingTranslationImportDraft,
  createTranslationImportDraftFromEntries,
  defaultTranslationImportText,
  formatTranslationImportDraft,
  formatTranslationImportDraftNotice,
} from "../translation-import-draft";
import { readTranslationImportErrorDetails } from "../translation-import-error-details";
import { downloadTranslationExport } from "../translation-export-file";
import {
  addTranslationImportResultHistoryEntry,
  clearTranslationImportResultHistory,
  createTranslationImportResultHistoryEntry,
  formatTranslationBulkRepairCompletionMessage,
  formatTranslationBulkRetryError,
  formatTranslationImportHistoryReplayMessage,
  readTranslationBulkRepairCoveredMissingKeys,
  type TranslationImportResultHistoryEntry,
} from "../translation-import-result-history";
import { useTranslationBulkRepairConfirmation } from "./use-translation-bulk-repair-confirmation";
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
  const [historyReplayNotice, setHistoryReplayNotice] = useState<string | null>(
    null,
  );
  const [repairCompletionNotice, setRepairCompletionNotice] = useState<
    string | null
  >(null);
  const [importResultHistory, setImportResultHistory] = useState<
    TranslationImportResultHistoryEntry[]
  >([]);
  const [loadingAction, setLoadingAction] =
    useState<TranslationBulkLoadingAction | null>(null);
  const importSequenceRef = useRef(0);
  const missingKeyDraft = useMemo(
    () =>
      createMissingTranslationImportDraft(
        input.missingKeys ?? [],
        input.meta.locale,
      ),
    [input.meta.locale, input.missingKeys],
  );
  const repairConfirmation = useTranslationBulkRepairConfirmation({
    locale: input.meta.locale,
    missingKeys: input.missingKeys,
    requestId: input.meta.requestId,
  });

  function useMissingKeyDraft() {
    useImportDraft(
      formatTranslationImportDraft(missingKeyDraft),
      formatTranslationImportDraftNotice({
        entryCount: missingKeyDraft.entries.length,
        source: "missing-keys",
      }),
    );
  }

  function useResultDraft(entries: TranslationImportResultEntry[]) {
    useImportDraft(
      formatTranslationImportDraft(
        createTranslationImportDraftFromEntries(entries),
      ),
      formatTranslationImportDraftNotice({
        entryCount: entries.length,
        source: "import-result",
      }),
    );
  }

  function useImportDraft(text: string, notice: string) {
    setError(null);
    setExportPreview(null);
    setImportErrorDetails(null);
    setImportPreview(null);
    setImportResult(null);
    setDraftNotice(notice);
    setHistoryReplayNotice(null);
    setRepairCompletionNotice(null);
    repairConfirmation.clear();
    setImportText(text);
  }

  function handleImportTextChange(value: string) {
    setDraftNotice(null);
    setHistoryReplayNotice(null);
    setImportText(value);
  }

  const runImportPreview = async () => {
    setLoadingAction("preview-import");
    setError(null);
    setImportErrorDetails(null);
    setImportResult(null);
    setDraftNotice(null);
    setHistoryReplayNotice(null);
    setRepairCompletionNotice(null);
    repairConfirmation.clear();

    try {
      setImportPreview(await previewTranslationImport(JSON.parse(importText)));
    } catch (caught) {
      setError(readActionError("preview-import", caught));
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
    setHistoryReplayNotice(null);
    setRepairCompletionNotice(null);
    repairConfirmation.clear();

    try {
      const result = await importTranslations(JSON.parse(importText));
      setImportResult(result);
      recordImportResult(result);
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
      await input.onImported?.(result);
      repairConfirmation.begin(repairedKeys, result.entries[0]?.key ?? null);
    } catch (caught) {
      setError(readActionError("import", caught));
      setImportErrorDetails(readTranslationImportErrorDetails(caught));
    } finally {
      setLoadingAction(null);
    }
  };
  const runExportPreview = async () => {
    setLoadingAction("export");
    setError(null);
    setImportErrorDetails(null);
    setHistoryReplayNotice(null);

    try {
      setExportPreview(
        await previewTranslationExport(
          input.filters,
          input.meta.requestedLocale,
        ),
      );
    } catch (caught) {
      setError(readActionError("export", caught));
    } finally {
      setLoadingAction(null);
    }
  };
  const runExportDownload = async () => {
    setLoadingAction("download");
    setError(null);
    setImportErrorDetails(null);
    setHistoryReplayNotice(null);

    try {
      downloadTranslationExport(
        await exportTranslations(input.filters, input.meta.requestedLocale),
      );
    } catch (caught) {
      setError(readActionError("download", caught));
    } finally {
      setLoadingAction(null);
    }
  };

  function restoreImportResult(entry: TranslationImportResultHistoryEntry) {
    setError(null);
    setExportPreview(null);
    setImportErrorDetails(null);
    setImportPreview(null);
    setImportResult(entry.result);
    setDraftNotice(null);
    setHistoryReplayNotice(formatTranslationImportHistoryReplayMessage(entry));
    setRepairCompletionNotice(null);
    repairConfirmation.clear();
  }

  function clearImportResultHistory() {
    setImportResultHistory(clearTranslationImportResultHistory());
  }

  function recordImportResult(result: TranslationImportResult) {
    importSequenceRef.current += 1;
    const entry = createTranslationImportResultHistoryEntry(
      result,
      importSequenceRef.current,
    );

    setImportResultHistory((current) =>
      addTranslationImportResultHistoryEntry(current, entry),
    );
  }

  return {
    clearImportResultHistory,
    draftNotice,
    error,
    exportPreview,
    hasMissingKeyDraft: missingKeyDraft.entries.length > 0,
    historyReplayNotice,
    importErrorDetails,
    importPreview,
    importResult,
    importResultHistory,
    importText,
    loadingAction,
    repairCompletionNotice,
    repairServerNotice: repairConfirmation.notice,
    restoreImportResult,
    runExportDownload,
    runExportPreview,
    runImport,
    runImportPreview,
    useMissingKeyDraft,
    useResultDraft,
    handleImportTextChange,
  };
}

function readActionError(
  action: TranslationBulkLoadingAction,
  error: unknown,
): string {
  return formatTranslationBulkRetryError({
    action,
    message: formatPreviewError(error),
  });
}

function formatPreviewError(error: unknown): string {
  if (error instanceof SyntaxError) {
    return "Import preview JSON could not be parsed.";
  }

  return formatRequestError(error);
}
