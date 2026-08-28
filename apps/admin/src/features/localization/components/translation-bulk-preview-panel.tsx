import { Input, Space } from "antd";
import { useMemo, useState } from "react";
import { useTranslationBulkPreview } from "../hooks/use-translation-bulk-preview";
import {
  buildTranslationExportAuditLogPath,
  buildTranslationImportAuditLogPath,
} from "../translation-audit-log-link";
import {
  formatTranslationBulkExportConfirmationSummary,
  formatTranslationBulkImportConfirmationSummary,
} from "../translation-bulk-confirmation-summary";
import { readTranslationImportFocusedResultKey } from "../translation-import-focus";
import { readTranslationImportHistoryFilterAlignment } from "../translation-import-history-alignment";
import { createTranslationImportPreviewRepairDraftState } from "../translation-import-preview-repair-draft";
import type {
  LocalizationTranslationsMeta,
  TranslationImportResult,
  TranslationListFilters,
} from "../types";
import { TranslationExportPreviewResultView } from "./translation-export-preview-result";
import { TranslationBulkActionBar } from "./translation-bulk-action-bar";
import { TranslationBulkPreviewAlerts } from "./translation-bulk-preview-alerts";
import { TranslationImportErrorDetailsView } from "./translation-import-error-details";
import { TranslationImportPreviewResultView } from "./translation-import-preview-result";
import { TranslationImportResultView } from "./translation-import-result";
import { TranslationImportResultHistoryView } from "./translation-import-result-history";
import { TranslationImportTemplateGuide } from "./translation-import-template-guide";

export function TranslationBulkPreviewPanel(props: {
  focusedKey?: string | null;
  filters: TranslationListFilters;
  meta: LocalizationTranslationsMeta;
  missingKeys?: string[];
  onFocusKey?: (key: string) => Promise<void> | void;
  onImported?: (result: TranslationImportResult) => Promise<void> | void;
}) {
  const bulkPreview = useTranslationBulkPreview({
    filters: props.filters,
    meta: props.meta,
    missingKeys: props.missingKeys,
    onImported: props.onImported,
  });
  const [previewRepairDraftNotice, setPreviewRepairDraftNotice] = useState<
    string | null
  >(null);
  const importConfirmationSummary = useMemo(
    () =>
      formatTranslationBulkImportConfirmationSummary({
        filters: props.filters,
        importText: bulkPreview.importText,
        meta: props.meta,
        missingKeys: props.missingKeys,
        preview: bulkPreview.importPreview,
      }),
    [
      bulkPreview.importPreview,
      bulkPreview.importText,
      props.filters.namespace,
      props.filters.query,
      props.meta.limit,
      props.meta.locale,
      props.meta.page,
      props.meta.total,
      props.missingKeys,
    ],
  );
  const exportConfirmationSummary = useMemo(
    () =>
      formatTranslationBulkExportConfirmationSummary({
        exportPreview: bulkPreview.exportPreview,
        filters: props.filters,
        meta: props.meta,
      }),
    [
      bulkPreview.exportPreview,
      props.filters.namespace,
      props.filters.query,
      props.meta.limit,
      props.meta.locale,
      props.meta.page,
      props.meta.total,
    ],
  );
  const previewRepairDraftState = useMemo(
    () =>
      bulkPreview.importPreview
        ? createTranslationImportPreviewRepairDraftState({
            defaultLocale: props.meta.locale,
            importText: bulkPreview.importText,
            preview: bulkPreview.importPreview,
          })
        : null,
    [bulkPreview.importPreview, bulkPreview.importText, props.meta.locale],
  );
  const historyFilterAlignment = useMemo(
    () =>
      bulkPreview.historyReplayNotice && bulkPreview.importResult
        ? readTranslationImportHistoryFilterAlignment({
            filters: props.filters,
            result: bulkPreview.importResult,
          })
        : null,
    [
      bulkPreview.historyReplayNotice,
      bulkPreview.importResult,
      props.filters.limit,
      props.filters.namespace,
      props.filters.page,
      props.filters.query,
    ],
  );

  function handleRestoreImportResult(
    entry: Parameters<typeof bulkPreview.restoreImportResult>[0],
  ) {
    setPreviewRepairDraftNotice(null);
    const focusKey = bulkPreview.restoreImportResult(entry);

    if (focusKey) {
      void props.onFocusKey?.(focusKey);
    }
  }

  function handleUseMissingKeyDraft() {
    setPreviewRepairDraftNotice(null);
    bulkPreview.useMissingKeyDraft();
  }

  function handleUseResultDraft(
    entries: Parameters<typeof bulkPreview.useResultDraft>[0],
  ) {
    setPreviewRepairDraftNotice(null);
    bulkPreview.useResultDraft(entries);
  }

  function handleUseHistoryDraft(
    entry: Parameters<typeof bulkPreview.useHistoryDraft>[0],
  ) {
    setPreviewRepairDraftNotice(null);
    bulkPreview.useHistoryDraft(entry);
  }

  function handleImportTextChange(value: string) {
    setPreviewRepairDraftNotice(null);
    bulkPreview.handleImportTextChange(value);
  }

  function handleUsePreviewRepairDraft() {
    if (!previewRepairDraftState) {
      return;
    }

    setPreviewRepairDraftNotice(previewRepairDraftState.notice);
    bulkPreview.handleImportTextChange(previewRepairDraftState.text);
  }

  return (
    <Space direction="vertical" size={12} style={{ width: "100%" }}>
      <TranslationImportTemplateGuide
        defaultLocale={props.meta.locale}
        filters={props.filters}
        importText={bulkPreview.importText}
        missingKeys={props.missingKeys}
      />
      <TranslationBulkPreviewAlerts
        draftClearSuggestion={bulkPreview.draftClearSuggestion}
        draftNotice={bulkPreview.draftNotice}
        error={bulkPreview.error}
        exportAuditLogPath={buildTranslationExportAuditLogPath(
          props.meta.locale,
        )}
        exportReviewNotice={bulkPreview.exportReviewNotice}
        historyFilterAlignment={historyFilterAlignment}
        historyReplayCleanupSuggestion={
          bulkPreview.historyReplayCleanupSuggestion
        }
        historyReplayNotice={bulkPreview.historyReplayNotice}
        importAuditLogPath={buildTranslationImportAuditLogPath()}
        importReviewNotice={bulkPreview.importReviewNotice}
        onAlignHistoryFilters={props.onFocusKey}
        onClearHistoryReplay={bulkPreview.clearHistoryReplayAfterConfirmation}
        onClearImportDraftAfterSuccess={
          bulkPreview.clearImportDraftAfterSuccess
        }
        onClearImportResultHistory={bulkPreview.clearImportResultHistory}
        previewRepairDraftNotice={previewRepairDraftNotice}
        repairCleanupSuggestion={bulkPreview.repairCleanupSuggestion}
        repairCompletionNotice={bulkPreview.repairCompletionNotice}
        repairHistoryRetentionMessage={
          bulkPreview.repairHistoryRetentionMessage
        }
        repairServerNotice={bulkPreview.repairServerNotice}
      />
      <Input.TextArea
        autoSize={{ maxRows: 8, minRows: 5 }}
        onChange={(event) => handleImportTextChange(event.target.value)}
        value={bulkPreview.importText}
      />
      <TranslationBulkActionBar
        exportConfirmationSummary={exportConfirmationSummary}
        hasMissingKeyDraft={bulkPreview.hasMissingKeyDraft}
        importConfirmationSummary={importConfirmationSummary}
        loadingAction={bulkPreview.loadingAction}
        onExportDownload={() => void bulkPreview.runExportDownload()}
        onExportPreview={() => void bulkPreview.runExportPreview()}
        onImport={() => void bulkPreview.runImport()}
        onImportPreview={() => void bulkPreview.runImportPreview()}
        onUseMissingKeyDraft={handleUseMissingKeyDraft}
      />
      {bulkPreview.importErrorDetails ? (
        <TranslationImportErrorDetailsView
          details={bulkPreview.importErrorDetails}
        />
      ) : null}
      {bulkPreview.importResult ? (
        <TranslationImportResultView
          focusSource={bulkPreview.historyReplayNotice ? "history" : "import"}
          focusedKey={readTranslationImportFocusedResultKey(
            bulkPreview.importResult,
            props.focusedKey,
          )}
          onFocusKey={props.onFocusKey}
          onUseDraft={handleUseResultDraft}
          result={bulkPreview.importResult}
        />
      ) : null}
      {bulkPreview.importPreview ? (
        <TranslationImportPreviewResultView
          filters={props.filters}
          onFocusKey={props.onFocusKey}
          onUseRepairDraft={handleUsePreviewRepairDraft}
          preview={bulkPreview.importPreview}
          repairDraftDetailMessage={previewRepairDraftState?.detailMessage}
          repairDraftEntryCount={previewRepairDraftState?.entryCount ?? 0}
        />
      ) : null}
      {bulkPreview.exportPreview ? (
        <TranslationExportPreviewResultView
          preview={bulkPreview.exportPreview}
        />
      ) : null}
      <TranslationImportResultHistoryView
        entries={bulkPreview.importResultHistory}
        onClear={bulkPreview.clearImportResultHistory}
        onSelect={handleRestoreImportResult}
        onUseDraft={handleUseHistoryDraft}
      />
    </Space>
  );
}
