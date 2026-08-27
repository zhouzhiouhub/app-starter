import { Alert, Input, Space } from "antd";
import { useMemo, useState } from "react";
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
  formatTranslationImportDraftNotice,
  formatTranslationImportDraft,
} from "../translation-import-draft";
import { readTranslationImportErrorDetails } from "../translation-import-error-details";
import { downloadTranslationExport } from "../translation-export-file";
import { readTranslationImportFocusedResultKey } from "../translation-import-focus";
import type {
  LocalizationTranslationsMeta,
  TranslationExportPreviewResult,
  TranslationImportPreviewResult,
  TranslationImportResult,
  TranslationImportResultEntry,
  TranslationListFilters,
} from "../types";
import { TranslationExportPreviewResultView } from "./translation-export-preview-result";
import {
  TranslationBulkActionBar,
  type TranslationBulkLoadingAction,
} from "./translation-bulk-action-bar";
import { TranslationImportErrorDetailsView } from "./translation-import-error-details";
import { TranslationImportPreviewResultView } from "./translation-import-preview-result";
import { TranslationImportResultView } from "./translation-import-result";
import { TranslationImportTemplateGuide } from "./translation-import-template-guide";

export function TranslationBulkPreviewPanel(props: {
  focusedKey?: string | null;
  filters: TranslationListFilters;
  meta: LocalizationTranslationsMeta;
  missingKeys?: string[];
  onFocusKey?: (key: string) => Promise<void> | void;
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
  const [loadingAction, setLoadingAction] =
    useState<TranslationBulkLoadingAction | null>(null);
  const missingKeyDraft = useMemo(
    () =>
      createMissingTranslationImportDraft(
        props.missingKeys ?? [],
        props.meta.locale,
      ),
    [props.meta.locale, props.missingKeys],
  );
  const hasMissingKeyDraft = missingKeyDraft.entries.length > 0;

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
    setImportText(text);
  }

  function handleImportTextChange(value: string) {
    setDraftNotice(null);
    setImportText(value);
  }

  const runImportPreview = async () => {
    setLoadingAction("preview-import");
    setError(null);
    setImportErrorDetails(null);
    setImportResult(null);
    setDraftNotice(null);

    try {
      setImportPreview(await previewTranslationImport(JSON.parse(importText)));
    } catch (caught) {
      setError(formatPreviewError(caught));
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

    try {
      const result = await importTranslations(JSON.parse(importText));
      setImportResult(result);
      await props.onImported?.(result);
    } catch (caught) {
      setError(formatPreviewError(caught));
      setImportErrorDetails(readTranslationImportErrorDetails(caught));
    } finally {
      setLoadingAction(null);
    }
  };
  const runExportPreview = async () => {
    setLoadingAction("export");
    setError(null);
    setImportErrorDetails(null);

    try {
      setExportPreview(
        await previewTranslationExport(
          props.filters,
          props.meta.requestedLocale,
        ),
      );
    } catch (caught) {
      setError(formatPreviewError(caught));
    } finally {
      setLoadingAction(null);
    }
  };
  const runExportDownload = async () => {
    setLoadingAction("download");
    setError(null);
    setImportErrorDetails(null);

    try {
      downloadTranslationExport(
        await exportTranslations(props.filters, props.meta.requestedLocale),
      );
    } catch (caught) {
      setError(formatPreviewError(caught));
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <Space direction="vertical" size={12} style={{ width: "100%" }}>
      {error ? <Alert message={error} showIcon type="error" /> : null}
      <TranslationImportTemplateGuide
        defaultLocale={props.meta.locale}
        importText={importText}
        missingKeys={props.missingKeys}
      />
      {draftNotice ? (
        <Alert message={draftNotice} showIcon type="info" />
      ) : null}
      <Input.TextArea
        autoSize={{ maxRows: 8, minRows: 5 }}
        onChange={(event) => handleImportTextChange(event.target.value)}
        value={importText}
      />
      <TranslationBulkActionBar
        hasMissingKeyDraft={hasMissingKeyDraft}
        loadingAction={loadingAction}
        onExportDownload={() => void runExportDownload()}
        onExportPreview={() => void runExportPreview()}
        onImport={() => void runImport()}
        onImportPreview={() => void runImportPreview()}
        onUseMissingKeyDraft={useMissingKeyDraft}
      />
      {importErrorDetails ? (
        <TranslationImportErrorDetailsView details={importErrorDetails} />
      ) : null}
      {importResult ? (
        <TranslationImportResultView
          focusedKey={readTranslationImportFocusedResultKey(
            importResult,
            props.focusedKey,
          )}
          onFocusKey={props.onFocusKey}
          onUseDraft={useResultDraft}
          result={importResult}
        />
      ) : null}
      {importPreview ? (
        <TranslationImportPreviewResultView preview={importPreview} />
      ) : null}
      {exportPreview ? (
        <TranslationExportPreviewResultView preview={exportPreview} />
      ) : null}
    </Space>
  );
}

function formatPreviewError(error: unknown): string {
  if (error instanceof SyntaxError) {
    return "Import preview JSON could not be parsed.";
  }

  return formatRequestError(error);
}
