import { DeleteOutlined, EyeOutlined } from "@ant-design/icons";
import { Button, Space, Table, Typography } from "antd";
import type { TranslationImportResultHistoryEntry } from "../translation-import-result-history";

export function TranslationImportResultHistoryView(props: {
  entries: TranslationImportResultHistoryEntry[];
  onClear?: () => void;
  onSelect: (entry: TranslationImportResultHistoryEntry) => void;
}) {
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
    </Space>
  );
}
