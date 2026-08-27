import { Alert, Input, Space } from "antd";
import { useTranslationBulkPreview } from "../hooks/use-translation-bulk-preview";
import { readTranslationImportFocusedResultKey } from "../translation-import-focus";
import type {
  LocalizationTranslationsMeta,
  TranslationImportResult,
  TranslationListFilters,
} from "../types";
import { TranslationExportPreviewResultView } from "./translation-export-preview-result";
import { TranslationBulkActionBar } from "./translation-bulk-action-bar";
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

  return (
    <Space direction="vertical" size={12} style={{ width: "100%" }}>
      {bulkPreview.error ? (
        <Alert message={bulkPreview.error} showIcon type="error" />
      ) : null}
      <TranslationImportTemplateGuide
        defaultLocale={props.meta.locale}
        importText={bulkPreview.importText}
        missingKeys={props.missingKeys}
      />
      {bulkPreview.draftNotice ? (
        <Alert message={bulkPreview.draftNotice} showIcon type="info" />
      ) : null}
      {bulkPreview.historyReplayNotice ? (
        <Alert message={bulkPreview.historyReplayNotice} showIcon type="info" />
      ) : null}
      {bulkPreview.repairCompletionNotice ? (
        <Alert
          message={bulkPreview.repairCompletionNotice}
          showIcon
          type="success"
        />
      ) : null}
      {bulkPreview.repairServerNotice ? (
        <Alert
          message={bulkPreview.repairServerNotice.message}
          showIcon
          type={bulkPreview.repairServerNotice.type}
        />
      ) : null}
      <Input.TextArea
        autoSize={{ maxRows: 8, minRows: 5 }}
        onChange={(event) =>
          bulkPreview.handleImportTextChange(event.target.value)
        }
        value={bulkPreview.importText}
      />
      <TranslationBulkActionBar
        hasMissingKeyDraft={bulkPreview.hasMissingKeyDraft}
        loadingAction={bulkPreview.loadingAction}
        onExportDownload={() => void bulkPreview.runExportDownload()}
        onExportPreview={() => void bulkPreview.runExportPreview()}
        onImport={() => void bulkPreview.runImport()}
        onImportPreview={() => void bulkPreview.runImportPreview()}
        onUseMissingKeyDraft={bulkPreview.useMissingKeyDraft}
      />
      {bulkPreview.importErrorDetails ? (
        <TranslationImportErrorDetailsView
          details={bulkPreview.importErrorDetails}
        />
      ) : null}
      {bulkPreview.importResult ? (
        <TranslationImportResultView
          focusedKey={readTranslationImportFocusedResultKey(
            bulkPreview.importResult,
            props.focusedKey,
          )}
          onFocusKey={props.onFocusKey}
          onUseDraft={bulkPreview.useResultDraft}
          result={bulkPreview.importResult}
        />
      ) : null}
      {bulkPreview.importPreview ? (
        <TranslationImportPreviewResultView
          preview={bulkPreview.importPreview}
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
        onSelect={bulkPreview.restoreImportResult}
      />
    </Space>
  );
}
