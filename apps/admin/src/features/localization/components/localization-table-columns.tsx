import { Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import type {
  LocalizationLocale,
  LocalizationMarket,
  LocalizationTranslationEntry,
} from "../types";

export const marketColumns: ColumnsType<LocalizationMarket> = [
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

export const localeColumns: ColumnsType<LocalizationLocale> = [
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

export const translationColumns: ColumnsType<LocalizationTranslationEntry> = [
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

function renderStatusTag(value: string) {
  return <Tag color={value === "active" ? "green" : "default"}>{value}</Tag>;
}
