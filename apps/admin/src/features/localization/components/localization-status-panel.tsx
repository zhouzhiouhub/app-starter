import { Descriptions, Space, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { readLocalizationSummaryState } from "../localization-summary-state";
import type {
  LocalizationLocale,
  LocalizationMarket,
  LocalizationSummary,
} from "../types";

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

export function LocalizationStatusPanel(props: {
  summary: LocalizationSummary;
}) {
  const state = readLocalizationSummaryState(props.summary);

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
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
