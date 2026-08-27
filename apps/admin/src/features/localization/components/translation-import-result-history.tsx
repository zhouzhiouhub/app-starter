import { EyeOutlined } from "@ant-design/icons";
import { Button, Table, Typography } from "antd";
import type { TranslationImportResultHistoryEntry } from "../translation-import-result-history";

export function TranslationImportResultHistoryView(props: {
  entries: TranslationImportResultHistoryEntry[];
  onSelect: (entry: TranslationImportResultHistoryEntry) => void;
}) {
  if (props.entries.length === 0) {
    return null;
  }

  return (
    <Table<TranslationImportResultHistoryEntry>
      columns={[
        {
          dataIndex: "label",
          key: "label",
          render: (value: string) => <Typography.Text>{value}</Typography.Text>,
          title: "Recent imports",
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
            <Button
              icon={<EyeOutlined />}
              onClick={() => props.onSelect(record)}
              size="small"
            >
              View
            </Button>
          ),
          title: "Result",
          width: 120,
        },
      ]}
      dataSource={props.entries}
      pagination={false}
      rowKey="id"
      size="small"
    />
  );
}
