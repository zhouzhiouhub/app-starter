import { DownloadOutlined, FileSearchOutlined } from "@ant-design/icons";
import {
  Alert,
  Button,
  Descriptions,
  Input,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import { useState } from "react";
import { previewTranslationExport, previewTranslationImport } from "../api";
import { formatRequestError } from "../../../lib/api-error";
import type {
  LocalizationTranslationsMeta,
  TranslationExportPreviewResult,
  TranslationImportPreviewEntry,
  TranslationImportPreviewResult,
  TranslationListFilters,
} from "../types";

const defaultImportPreviewText = JSON.stringify(
  {
    entries: [
      {
        key: "page.home.hero.title",
        value: "Build better storefronts",
      },
    ],
  },
  null,
  2,
);

export function TranslationBulkPreviewPanel(props: {
  filters: TranslationListFilters;
  meta: LocalizationTranslationsMeta;
}) {
  const [importText, setImportText] = useState(defaultImportPreviewText);
  const [importPreview, setImportPreview] =
    useState<TranslationImportPreviewResult | null>(null);
  const [exportPreview, setExportPreview] =
    useState<TranslationExportPreviewResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingAction, setLoadingAction] = useState<
    "export" | "import" | null
  >(null);

  const runImportPreview = async () => {
    setLoadingAction("import");
    setError(null);

    try {
      setImportPreview(await previewTranslationImport(JSON.parse(importText)));
    } catch (caught) {
      setError(formatPreviewError(caught));
    } finally {
      setLoadingAction(null);
    }
  };
  const runExportPreview = async () => {
    setLoadingAction("export");
    setError(null);

    try {
      setExportPreview(
        await previewTranslationExport(
          props.filters,
          props.meta.requestedLocale,
        ),
      );
    } catch (caught) {
      setError(formatPreviewError(caught));
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <Space direction="vertical" size={12} style={{ width: "100%" }}>
      {error ? <Alert message={error} showIcon type="error" /> : null}
      <Input.TextArea
        autoSize={{ maxRows: 8, minRows: 5 }}
        onChange={(event) => setImportText(event.target.value)}
        value={importText}
      />
      <Space wrap>
        <Button
          icon={<FileSearchOutlined />}
          loading={loadingAction === "import"}
          onClick={() => void runImportPreview()}
        >
          Preview import
        </Button>
        <Button
          icon={<DownloadOutlined />}
          loading={loadingAction === "export"}
          onClick={() => void runExportPreview()}
        >
          Preview export
        </Button>
      </Space>
      {importPreview ? <ImportPreviewResult preview={importPreview} /> : null}
      {exportPreview ? <ExportPreviewResult preview={exportPreview} /> : null}
    </Space>
  );
}

function ImportPreviewResult(props: {
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

function ExportPreviewResult(props: {
  preview: TranslationExportPreviewResult;
}) {
  return (
    <Descriptions bordered column={{ md: 2, xs: 1 }} size="small">
      <Descriptions.Item label="Locale">
        <Typography.Text code>{props.preview.locale}</Typography.Text>
      </Descriptions.Item>
      <Descriptions.Item label="Exportable">
        {props.preview.exportableEntryCount}
      </Descriptions.Item>
      <Descriptions.Item label="Page keys">
        {props.preview.expectedKeyCount}
      </Descriptions.Item>
      <Descriptions.Item label="Missing">
        {props.preview.missingKeyCount}
      </Descriptions.Item>
      <Descriptions.Item label="Sample keys" span={2}>
        <Typography.Text code>
          {props.preview.sampleKeys.join(", ") || "none"}
        </Typography.Text>
      </Descriptions.Item>
    </Descriptions>
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

function formatPreviewError(error: unknown): string {
  if (error instanceof SyntaxError) {
    return "Import preview JSON could not be parsed.";
  }

  return formatRequestError(error);
}
