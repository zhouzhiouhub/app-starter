import { FileAddOutlined, SearchOutlined } from "@ant-design/icons";
import {
  Alert,
  Button,
  Descriptions,
  Segmented,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import { useMemo, useState } from "react";
import {
  filterTranslationImportResultEntries,
  readTranslationImportResultActionOptions,
  readSelectedTranslationImportResultEntries,
  readTranslationImportResultSelectionState,
  readTranslationImportResultRowKey,
  type TranslationImportResultActionFilter,
} from "../translation-import-result-filter";
import type { Key } from "react";
import type {
  TranslationImportResult,
  TranslationImportResultEntry,
} from "../types";

export function TranslationImportResultView(props: {
  focusedKey?: string | null;
  focusSource?: "history" | "import";
  onFocusKey?: (key: string) => Promise<void> | void;
  onUseDraft?: (entries: TranslationImportResultEntry[]) => void;
  result: TranslationImportResult;
}) {
  const [actionFilter, setActionFilter] =
    useState<TranslationImportResultActionFilter>("all");
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([]);
  const filteredEntries = useMemo(
    () => filterTranslationImportResultEntries(props.result, actionFilter),
    [actionFilter, props.result],
  );
  const selectedEntries = useMemo(
    () =>
      readSelectedTranslationImportResultEntries(
        props.result,
        selectedRowKeys.map(String),
      ),
    [props.result, selectedRowKeys],
  );
  const selectionState = useMemo(
    () =>
      readTranslationImportResultSelectionState({
        result: props.result,
        rowKeys: selectedRowKeys.map(String),
        visibleEntries: filteredEntries,
      }),
    [filteredEntries, props.result, selectedRowKeys],
  );
  const actionOptions = useMemo(
    () =>
      readTranslationImportResultActionOptions(props.result).map((option) => ({
        label: `${option.label} ${option.count}`,
        value: option.value,
      })),
    [props.result],
  );

  return (
    <Space direction="vertical" size={12} style={{ width: "100%" }}>
      {props.focusedKey ? (
        <Alert
          message={
            <span>
              {props.focusSource === "history"
                ? "History result replayed."
                : "Imported rows saved."}{" "}
              The translations table is focused on{" "}
              <Typography.Text code>{props.focusedKey}</Typography.Text>.
            </span>
          }
          showIcon
          type="success"
        />
      ) : null}
      <Descriptions bordered column={{ md: 4, xs: 1 }} size="small">
        <Descriptions.Item label="Imported">
          {props.result.summary.importedCount}
        </Descriptions.Item>
        <Descriptions.Item label="Created">
          {props.result.summary.createdCount}
        </Descriptions.Item>
        <Descriptions.Item label="Updated">
          {props.result.summary.updatedCount}
        </Descriptions.Item>
        <Descriptions.Item label="Rows">
          {props.result.summary.totalEntries}
        </Descriptions.Item>
      </Descriptions>
      <Space wrap>
        <Segmented
          onChange={(value) =>
            setActionFilter(value as TranslationImportResultActionFilter)
          }
          options={actionOptions}
          value={actionFilter}
        />
        {props.onUseDraft ? (
          <Button
            disabled={selectedEntries.length === 0}
            icon={<FileAddOutlined />}
            onClick={() => props.onUseDraft?.(selectedEntries)}
          >
            Use selected as draft {selectedEntries.length}
          </Button>
        ) : null}
        {selectionState.selectedCount > 0 ? (
          <Typography.Text type="secondary">
            Selected {selectionState.selectedCount};{" "}
            {selectionState.hiddenSelectedCount} kept outside this filter.
          </Typography.Text>
        ) : null}
      </Space>
      <Table<TranslationImportResultEntry>
        columns={[
          { dataIndex: "index", key: "index", title: "#", width: 72 },
          {
            dataIndex: "action",
            key: "action",
            render: (value: TranslationImportResultEntry["action"]) => (
              <Tag color={value === "create" ? "green" : "blue"}>{value}</Tag>
            ),
            title: "Action",
            width: 120,
          },
          {
            dataIndex: "key",
            key: "key",
            render: (value: string) => (
              <Typography.Text code>{value}</Typography.Text>
            ),
            title: "Key",
          },
          {
            dataIndex: "locale",
            key: "locale",
            render: (value: string) => (
              <Typography.Text code>{value}</Typography.Text>
            ),
            title: "Locale",
            width: 120,
          },
          {
            key: "focus",
            render: (_, record) =>
              props.onFocusKey ? (
                <Button
                  disabled={props.focusedKey === record.key}
                  icon={<SearchOutlined />}
                  onClick={() => void props.onFocusKey?.(record.key)}
                  size="small"
                >
                  {props.focusedKey === record.key ? "Focused" : "Focus"}
                </Button>
              ) : null,
            title: "Focus",
            width: 120,
          },
          {
            dataIndex: "value",
            ellipsis: true,
            key: "value",
            title: "Value",
          },
        ]}
        dataSource={filteredEntries}
        locale={{ emptyText: "No imported rows match the current action." }}
        pagination={false}
        rowKey={readTranslationImportResultRowKey}
        rowSelection={
          props.onUseDraft
            ? {
                onChange: (keys) => setSelectedRowKeys(keys),
                preserveSelectedRowKeys: true,
                selectedRowKeys,
              }
            : undefined
        }
        size="small"
      />
    </Space>
  );
}
