import { FileAddOutlined, SearchOutlined } from "@ant-design/icons";
import {
  Alert,
  Button,
  Descriptions,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import { readTranslationImportPreviewFilterDifference } from "../translation-import-filter-difference";
import type {
  TranslationImportPreviewEntry,
  TranslationImportPreviewResult,
  TranslationListFilters,
} from "../types";

export function TranslationImportPreviewResultView(props: {
  filters?: TranslationListFilters;
  onFocusKey?: (key: string) => Promise<void> | void;
  onUseRepairDraft?: () => void;
  preview: TranslationImportPreviewResult;
  repairDraftEntryCount?: number;
}) {
  const filterDifference = readTranslationImportPreviewFilterDifference({
    filters: props.filters,
    preview: props.preview,
  });

  return (
    <Space direction="vertical" size={12} style={{ width: "100%" }}>
      {filterDifference ? (
        <Alert
          action={
            props.onFocusKey ? (
              <Button
                icon={<SearchOutlined />}
                onClick={() =>
                  void props.onFocusKey?.(filterDifference.firstKey)
                }
                size="small"
              >
                Focus first difference
              </Button>
            ) : undefined
          }
          message={filterDifference.message}
          showIcon
          type="warning"
        />
      ) : null}
      {props.onUseRepairDraft ? (
        <Space wrap>
          <Tooltip title="Rebuild a draft from preview rows marked create or update; issue rows stay out for review.">
            <span>
              <Button
                disabled={!props.repairDraftEntryCount}
                icon={<FileAddOutlined />}
                onClick={props.onUseRepairDraft}
              >
                Use preview repair draft {props.repairDraftEntryCount ?? 0}
              </Button>
            </span>
          </Tooltip>
        </Space>
      ) : null}
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
