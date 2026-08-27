import { Space, Table } from "antd";
import { useState } from "react";
import { readLocalizationSummaryState } from "../localization-summary-state";
import {
  mergeResolvedTranslationKeys,
  readMissingTranslationKeyAdvanceTarget,
} from "../missing-translation-key-queue";
import {
  readTranslationImportFocusFilters,
  readTranslationImportFocusFiltersForKey,
} from "../translation-import-focus";
import {
  areTranslationListFiltersEqual,
  readTranslationKeyRepairFilters,
} from "../translation-list-query";
import type {
  LocalizationLocale,
  LocalizationMarket,
  LocalizationSummary,
  LocalizationTranslationEntry,
  TranslationImportResult,
  TranslationListFilters,
  UpsertDefaultTranslationResult,
} from "../types";
import { DefaultTranslationEntryForm } from "./default-translation-entry-form";
import {
  localeColumns,
  marketColumns,
  translationColumns,
} from "./localization-table-columns";
import { LocalizationOverview } from "./localization-overview";
import { MissingTranslationKeysAlert } from "./missing-translation-keys-alert";
import { TranslationBulkPreviewPanel } from "./translation-bulk-preview-panel";
import { TranslationListFilterBar } from "./translation-list-filter-bar";

export function LocalizationStatusPanel(props: {
  filters: TranslationListFilters;
  isFiltering?: boolean;
  onFiltersChange: (filters: TranslationListFilters) => void;
  onPageChange: (page: number, limit: number) => void;
  onTranslationsImported?: () => Promise<void> | void;
  onTranslationSaved?: () => Promise<void> | void;
  summary: LocalizationSummary;
}) {
  const state = readLocalizationSummaryState(props.summary);
  const [translationDraft, setTranslationDraft] = useState<{
    key: string;
    version: number;
  } | null>(null);
  const [recentlyResolvedKeys, setRecentlyResolvedKeys] = useState<string[]>(
    [],
  );
  const hasTranslationFilters = Boolean(
    props.filters.namespace || props.filters.query,
  );

  function selectMissingTranslationKey(key: string) {
    setTranslationDraft((current) => ({
      key,
      version: (current?.version ?? 0) + 1,
    }));
    const repairFilters = readTranslationKeyRepairFilters(key, props.filters);

    if (repairFilters) {
      props.onFiltersChange(repairFilters);
    }
  }

  async function handleTranslationSaved(
    result: UpsertDefaultTranslationResult,
  ) {
    const nextDraftKey = readMissingTranslationKeyAdvanceTarget({
      keys: props.summary.translationsMeta.missingKeys,
      resolvedKey: result.entry.key,
      resolvedKeys: recentlyResolvedKeys,
      selectedKey: translationDraft?.key,
    });

    markResolvedKeys([result.entry.key]);
    setTranslationDraft((current) =>
      nextDraftKey
        ? { key: nextDraftKey, version: (current?.version ?? 0) + 1 }
        : null,
    );

    const repairFilters = readTranslationKeyRepairFilters(
      result.entry.key,
      props.filters,
    );

    if (
      repairFilters &&
      !areTranslationListFiltersEqual(props.filters, repairFilters)
    ) {
      props.onFiltersChange(repairFilters);
      return;
    }

    await props.onTranslationSaved?.();
  }

  function markResolvedKeys(keys: string[]) {
    setRecentlyResolvedKeys((current) =>
      mergeResolvedTranslationKeys(current, keys),
    );
  }

  async function handleImportResultFocus(key: string) {
    const focusFilters = readTranslationImportFocusFiltersForKey(
      key,
      props.filters,
    );

    if (
      focusFilters &&
      !areTranslationListFiltersEqual(props.filters, focusFilters)
    ) {
      props.onFiltersChange(focusFilters);
      return;
    }

    await props.onTranslationsImported?.();
  }

  async function handleTranslationsImported(result: TranslationImportResult) {
    markResolvedKeys(result.entries.map((entry) => entry.key));
    const focusFilters = readTranslationImportFocusFilters(
      result,
      props.filters,
    );

    if (
      focusFilters &&
      !areTranslationListFiltersEqual(props.filters, focusFilters)
    ) {
      props.onFiltersChange(focusFilters);
      return;
    }

    await props.onTranslationsImported?.();
  }

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <LocalizationOverview state={state} />
      <Table<LocalizationMarket>
        columns={marketColumns}
        dataSource={props.summary.markets}
        pagination={false}
        rowKey="code"
        size="small"
      />
      <Table<LocalizationLocale>
        columns={localeColumns}
        dataSource={props.summary.locales}
        pagination={false}
        rowKey="code"
        size="small"
      />
      <DefaultTranslationEntryForm
        defaultLocale={state.defaultLocale}
        draftKey={translationDraft?.key}
        draftVersion={translationDraft?.version}
        keyOptions={props.summary.translationsMeta.missingKeys}
        locateSavedEntry
        onSaved={handleTranslationSaved}
      />
      <TranslationBulkPreviewPanel
        focusedKey={props.filters.query}
        filters={props.filters}
        missingKeys={props.summary.translationsMeta.missingKeys}
        meta={props.summary.translationsMeta}
        onFocusKey={handleImportResultFocus}
        onImported={handleTranslationsImported}
      />
      <TranslationListFilterBar
        filters={props.filters}
        isLoading={props.isFiltering}
        onChange={props.onFiltersChange}
      />
      <MissingTranslationKeysAlert
        isSelectingKey={props.isFiltering}
        meta={props.summary.translationsMeta}
        onSelectKey={selectMissingTranslationKey}
        resolvedKeys={recentlyResolvedKeys}
        selectedKey={translationDraft?.key}
      />
      <Table<LocalizationTranslationEntry>
        columns={translationColumns}
        dataSource={props.summary.translations}
        locale={{
          emptyText: hasTranslationFilters
            ? "No default locale entries match the current filters."
            : "No translation entries are stored for this fallback probe.",
        }}
        pagination={{
          current: state.translationPage,
          onChange: props.onPageChange,
          pageSize: state.translationLimit,
          showSizeChanger: false,
          total: state.translationTotal,
        }}
        rowKey={(record) => `${record.locale}:${record.key}`}
        size="small"
      />
    </Space>
  );
}
