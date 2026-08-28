import {
  DeleteOutlined,
  EyeOutlined,
  FileAddOutlined,
} from "@ant-design/icons";
import {
  Alert,
  Button,
  Popconfirm,
  Segmented,
  Space,
  Table,
  Typography,
  Tooltip,
} from "antd";
import { useMemo, useState } from "react";
import {
  filterTranslationImportResultHistoryEntries,
  formatTranslationImportHistoryClearConfirmation,
  formatTranslationImportHistoryFilterEmptyMessage,
  readTranslationImportResultHistoryFilterOptions,
  type TranslationImportResultHistoryEntry,
  type TranslationImportResultHistoryFilter,
} from "../translation-import-result-history";
import { formatTranslationImportHistoryActionHint } from "../translation-key-action-hints";

export function TranslationImportResultHistoryView(props: {
  entries: TranslationImportResultHistoryEntry[];
  onClear?: () => void;
  onSelect: (entry: TranslationImportResultHistoryEntry) => void;
  onUseDraft?: (entry: TranslationImportResultHistoryEntry) => void;
}) {
  const [filter, setFilter] =
    useState<TranslationImportResultHistoryFilter>("all");
  const filterOptions = useMemo(
    () =>
      readTranslationImportResultHistoryFilterOptions(props.entries).map(
        (option) => ({
          label: `${option.label} ${option.count}`,
          value: option.value,
        }),
      ),
    [props.entries],
  );
  const filteredEntries = useMemo(
    () => filterTranslationImportResultHistoryEntries(props.entries, filter),
    [filter, props.entries],
  );
  const filterEmptyMessage = formatTranslationImportHistoryFilterEmptyMessage({
    filter,
    totalCount: props.entries.length,
  });
  const clearConfirmation = formatTranslationImportHistoryClearConfirmation({
    historyCount: props.entries.length,
  });

  if (props.entries.length === 0) {
    return null;
  }

  return (
    <Space direction="vertical" size={8} style={{ width: "100%" }}>
      <Space align="center" style={{ justifyContent: "space-between" }} wrap>
        <Typography.Title level={5} style={{ margin: 0 }}>
          Recent import results
        </Typography.Title>
        {props.onClear && clearConfirmation ? (
          <Popconfirm
            cancelText="Keep history"
            okText="Clear"
            onConfirm={props.onClear}
            title="Clear recent import history?"
            description={clearConfirmation}
          >
            <Button icon={<DeleteOutlined />} size="small">
              Clear history
            </Button>
          </Popconfirm>
        ) : null}
      </Space>
      <Segmented
        onChange={(value) =>
          setFilter(value as TranslationImportResultHistoryFilter)
        }
        options={filterOptions}
        value={filter}
      />
      {filterEmptyMessage && filteredEntries.length === 0 ? (
        <Alert
          action={
            <Button onClick={() => setFilter("all")} size="small">
              Show all
            </Button>
          }
          message={filterEmptyMessage}
          showIcon
          type="info"
        />
      ) : null}
      <Table<TranslationImportResultHistoryEntry>
        columns={[
          {
            dataIndex: "label",
            key: "label",
            render: (value: string) => (
              <Typography.Text>{value}</Typography.Text>
            ),
            title: "Import",
          },
          {
            key: "summary",
            render: (_, record) =>
              `${record.result.summary.importedCount} imported, ${record.result.summary.createdCount} created, ${record.result.summary.updatedCount} updated`,
            title: "Summary",
          },
          {
            key: "view",
            render: (_, record) => (
              <Space size={6} wrap>
                <Tooltip
                  title={formatTranslationImportHistoryActionHint({
                    action: "view",
                    entry: record,
                  })}
                >
                  <Button
                    icon={<EyeOutlined />}
                    onClick={() => props.onSelect(record)}
                    size="small"
                  >
                    View
                  </Button>
                </Tooltip>
                {props.onUseDraft ? (
                  <Tooltip
                    title={formatTranslationImportHistoryActionHint({
                      action: "draft",
                      entry: record,
                    })}
                  >
                    <Button
                      icon={<FileAddOutlined />}
                      onClick={() => props.onUseDraft?.(record)}
                      size="small"
                    >
                      Draft
                    </Button>
                  </Tooltip>
                ) : null}
              </Space>
            ),
            title: "Result",
            width: 180,
          },
        ]}
        dataSource={filteredEntries}
        locale={{
          emptyText:
            filterEmptyMessage ?? "No recent import results match this filter.",
        }}
        pagination={false}
        rowKey="id"
        size="small"
      />
    </Space>
  );
}
