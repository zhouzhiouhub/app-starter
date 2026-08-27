import { Descriptions, Space, Table, Tag, Typography } from "antd";
import type {
  TranslationImportPreviewEntry,
  TranslationImportPreviewResult,
} from "../types";

export function TranslationImportPreviewResultView(props: {
  preview: TranslationImportPreviewResult;
}) {
  return (
    <Space direction="vertical" size={12} style={{ width: "100%" }}>
      <Descriptions bordered column={{ md: 3, xs: 1 }} size="small">
        <Descriptions.Item label="Create">
          {props.preview.summary.createCount}
        </Descriptions.Item>
        <Descriptions.Item label="Update">
          {props.preview.summary.updateCount}
        </Descriptions.Item>
        <Descriptions.Item label="Blocked">
          {props.preview.summary.blockedCount}
        </Descriptions.Item>
        <Descriptions.Item label="Duplicate">
          {props.preview.summary.duplicateCount}
        </Descriptions.Item>
        <Descriptions.Item label="Error">
          {props.preview.summary.errorCount}
        </Descriptions.Item>
        <Descriptions.Item label="Rows">
          {props.preview.summary.totalEntries}
        </Descriptions.Item>
      </Descriptions>
      <Table<TranslationImportPreviewEntry>
        columns={[
          { dataIndex: "index", key: "index", title: "#", width: 72 },
          {
            dataIndex: "action",
            key: "action",
            render: (value: TranslationImportPreviewEntry["action"]) => (
              <Tag color={readActionColor(value)}>{value}</Tag>
            ),
            title: "Action",
            width: 120,
          },
          {
            dataIndex: "key",
            key: "key",
            render: (value?: string) =>
              value ? <Typography.Text code>{value}</Typography.Text> : "",
            title: "Key",
          },
          {
            dataIndex: "locale",
            key: "locale",
            render: (value?: string) =>
              value ? <Typography.Text code>{value}</Typography.Text> : "",
            title: "Locale",
            width: 120,
          },
          {
            key: "issues",
            render: (_, record) =>
              record.issues.map((issue) => issue.message).join("; "),
            title: "Issues",
          },
        ]}
        dataSource={props.preview.entries}
        pagination={false}
        rowKey={(record) => String(record.index)}
        size="small"
      />
    </Space>
  );
}

function readActionColor(action: TranslationImportPreviewEntry["action"]) {
  if (action === "create") {
    return "green";
  }

  if (action === "update") {
    return "blue";
  }

  if (action === "blocked" || action === "duplicate") {
    return "orange";
  }

  return "red";
}
