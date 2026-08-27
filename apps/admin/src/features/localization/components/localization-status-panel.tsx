import { Alert, Descriptions, Space, Table, Tag, Typography } from "antd";
import { useState } from "react";
import { readLocalizationSummaryState } from "../localization-summary-state";
import { readTranslationImportFocusFilters } from "../translation-import-focus";
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
import { MissingTranslationKeysAlert } from "./missing-translation-keys-alert";
import { TranslationBulkPreviewPanel } from "./translation-bulk-preview-panel";
import { TranslationCoverageProgress } from "./translation-coverage-progress";
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

  async function handleTranslationsImported(result: TranslationImportResult) {
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
      <Alert
        description="Non-default Locale creation and publishing return MULTI_LOCALE_DISABLED while the MVP flag is off."
        message="Multi-locale writes disabled"
        showIcon
        type="info"
      />
      <Descriptions bordered column={{ md: 2, xs: 1 }} size="small">
        <Descriptions.Item label="Default market">
          <Typography.Text code>{state.defaultMarket}</Typography.Text>
        </Descriptions.Item>
        <Descriptions.Item label="Currency">
          {state.marketCurrency}
        </Descriptions.Item>
        <Descriptions.Item label="Default locale">
          <Typography.Text code>{state.defaultLocale}</Typography.Text>
        </Descriptions.Item>
        <Descriptions.Item label="Fallback locale">
          <Typography.Text code>{state.fallbackLocale}</Typography.Text>
        </Descriptions.Item>
        <Descriptions.Item label="Translation fallback">
          <Tag color={state.isFallback ? "orange" : "green"}>
            {state.isFallback ? "fallback" : "default"}
          </Tag>
        </Descriptions.Item>
        <Descriptions.Item label="Translation entries">
          <Space size={4}>
            <span>{state.translationTotal}</span>
            <Typography.Text type="secondary">
              / {state.translationEntryLimit}
            </Typography.Text>
          </Space>
        </Descriptions.Item>
        <Descriptions.Item label="Page keys missing">
          <Tag color={state.missingKeyCount > 0 ? "orange" : "green"}>
            {state.missingKeyCount}
          </Tag>
        </Descriptions.Item>
        <Descriptions.Item label="Page key coverage">
          <TranslationCoverageProgress
            expectedKeyCount={state.translationExpectedKeyCount}
            missingKeyCount={state.missingKeyCount}
            percent={state.translationCoveragePercent}
            resolvedKeyCount={state.translationResolvedKeyCount}
          />
        </Descriptions.Item>
        <Descriptions.Item label="Fallback probe">
          <Space size={4}>
            <Typography.Text code>
              {state.translationRequestedLocale}
            </Typography.Text>
            <Typography.Text type="secondary">-&gt;</Typography.Text>
            <Typography.Text code>
              {state.translationResolvedLocale}
            </Typography.Text>
          </Space>
        </Descriptions.Item>
        <Descriptions.Item label="MVP state">
          <Tag color={readStateTagColor(state.status)}>{state.status}</Tag>
        </Descriptions.Item>
      </Descriptions>
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
        filters={props.filters}
        missingKeys={props.summary.translationsMeta.missingKeys}
        meta={props.summary.translationsMeta}
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

function readStateTagColor(
  status: ReturnType<typeof readLocalizationSummaryState>["status"],
): string {
  return status === "active"
    ? "green"
    : status === "fallback"
      ? "orange"
      : "red";
}
