import { Alert, Descriptions, Space, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { readLocalizationSummaryState } from "../localization-summary-state";
import type {
  LocalizationLocale,
  LocalizationMarket,
  LocalizationSummary,
  LocalizationTranslationEntry,
  TranslationListFilters,
} from "../types";
import { DefaultTranslationEntryForm } from "./default-translation-entry-form";
import { MissingTranslationKeysAlert } from "./missing-translation-keys-alert";
import { TranslationBulkPreviewPanel } from "./translation-bulk-preview-panel";
import { TranslationListFilterBar } from "./translation-list-filter-bar";

const marketColumns: ColumnsType<LocalizationMarket> = [
  {
    dataIndex: "code",
    key: "code",
    title: "Market",
    render: (value: string) => <Typography.Text code>{value}</Typography.Text>,
  },
  {
    dataIndex: "defaultLocale",
    key: "defaultLocale",
    title: "Default locale",
  },
  {
    dataIndex: "currency",
    key: "currency",
    title: "Currency",
  },
  {
    dataIndex: "status",
    key: "status",
    title: "Status",
    render: renderStatusTag,
  },
];

const localeColumns: ColumnsType<LocalizationLocale> = [
  {
    dataIndex: "code",
    key: "code",
    title: "Locale",
    render: (value: string) => <Typography.Text code>{value}</Typography.Text>,
  },
  {
    dataIndex: "fallbackLocale",
    key: "fallbackLocale",
    title: "Fallback locale",
  },
  {
    dataIndex: "status",
    key: "status",
    title: "Status",
    render: renderStatusTag,
  },
];

const translationColumns: ColumnsType<LocalizationTranslationEntry> = [
  {
    dataIndex: "key",
    key: "key",
    title: "Key",
    render: (value: string) => <Typography.Text code>{value}</Typography.Text>,
  },
  {
    dataIndex: "locale",
    key: "locale",
    title: "Locale",
    render: (value: string) => <Typography.Text code>{value}</Typography.Text>,
  },
  {
    dataIndex: "value",
    ellipsis: true,
    key: "value",
    title: "Value",
  },
  {
    dataIndex: "context",
    key: "context",
    render: (value?: string | null) => value ?? "not set",
    title: "Context",
  },
];

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
  const hasTranslationFilters = Boolean(
    props.filters.namespace || props.filters.query,
  );

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
        onSaved={props.onTranslationSaved}
      />
      <TranslationBulkPreviewPanel
        filters={props.filters}
        meta={props.summary.translationsMeta}
        onImported={props.onTranslationsImported}
      />
      <TranslationListFilterBar
        filters={props.filters}
        isLoading={props.isFiltering}
        onChange={props.onFiltersChange}
      />
      <MissingTranslationKeysAlert meta={props.summary.translationsMeta} />
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

function renderStatusTag(value: string) {
  return <Tag color={value === "active" ? "green" : "default"}>{value}</Tag>;
}

function readStateTagColor(
  status: ReturnType<typeof readLocalizationSummaryState>["status"],
): string {
  if (status === "active") {
    return "green";
  }

  if (status === "fallback") {
    return "orange";
  }

  return "red";
}
