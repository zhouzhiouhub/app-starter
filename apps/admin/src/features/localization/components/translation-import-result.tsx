import { Alert, Descriptions, Space, Table, Tag, Typography } from "antd";
import type {
  TranslationImportResult,
  TranslationImportResultEntry,
} from "../types";

export function TranslationImportResultView(props: {
  focusedKey?: string | null;
  result: TranslationImportResult;
}) {
  return (
    <Space direction="vertical" size={12} style={{ width: "100%" }}>
      {props.focusedKey ? (
        <Alert
          message={
            <span>
              Imported rows saved. The translations table is focused on{" "}
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
            dataIndex: "value",
            ellipsis: true,
            key: "value",
            title: "Value",
          },
        ]}
        dataSource={props.result.entries}
        pagination={false}
        rowKey={(record) => `${record.index}:${record.locale}:${record.key}`}
        size="small"
      />
    </Space>
  );
}
