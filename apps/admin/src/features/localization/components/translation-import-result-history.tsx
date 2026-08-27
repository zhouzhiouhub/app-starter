import {
  DeleteOutlined,
  EyeOutlined,
  FileAddOutlined,
} from "@ant-design/icons";
import { Button, Segmented, Space, Table, Typography } from "antd";
import { useMemo, useState } from "react";
import {
  filterTranslationImportResultHistoryEntries,
  readTranslationImportResultHistoryFilterOptions,
  type TranslationImportResultHistoryEntry,
  type TranslationImportResultHistoryFilter,
} from "../translation-import-result-history";

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

  if (props.entries.length === 0) {
    return null;
  }

  return (
    <Space direction="vertical" size={8} style={{ width: "100%" }}>
      <Space align="center" style={{ justifyContent: "space-between" }} wrap>
        <Typography.Title level={5} style={{ margin: 0 }}>
          Recent import results
        </Typography.Title>
        {props.onClear ? (
          <Button
            icon={<DeleteOutlined />}
            onClick={props.onClear}
            size="small"
          >
            Clear history
          </Button>
        ) : null}
      </Space>
      <Segmented
        onChange={(value) =>
          setFilter(value as TranslationImportResultHistoryFilter)
        }
        options={filterOptions}
        value={filter}
      />
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
                <Button
                  icon={<EyeOutlined />}
                  onClick={() => props.onSelect(record)}
                  size="small"
                >
                  View
                </Button>
                {props.onUseDraft ? (
                  <Button
                    icon={<FileAddOutlined />}
                    onClick={() => props.onUseDraft?.(record)}
                    size="small"
                  >
                    Draft
                  </Button>
                ) : null}
              </Space>
            ),
            title: "Result",
            width: 180,
          },
        ]}
        dataSource={filteredEntries}
        locale={{ emptyText: "No recent import results match this filter." }}
        pagination={false}
        rowKey="id"
        size="small"
      />
    </Space>
  );
}
