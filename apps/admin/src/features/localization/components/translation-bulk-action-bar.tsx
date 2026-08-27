import {
  DownloadOutlined,
  FileAddOutlined,
  FileSearchOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import { Button, Popconfirm, Space } from "antd";

export type TranslationBulkLoadingAction =
  "download" | "export" | "import" | "preview-import";

export function TranslationBulkActionBar(props: {
  hasMissingKeyDraft: boolean;
  loadingAction?: TranslationBulkLoadingAction | null;
  onExportDownload: () => void;
  onExportPreview: () => void;
  onImport: () => void;
  onImportPreview: () => void;
  onUseMissingKeyDraft: () => void;
}) {
  return (
    <Space wrap>
      <Button
        disabled={!props.hasMissingKeyDraft}
        icon={<FileAddOutlined />}
        onClick={props.onUseMissingKeyDraft}
      >
        Use missing key draft
      </Button>
      <Button
        icon={<FileSearchOutlined />}
        loading={props.loadingAction === "preview-import"}
        onClick={props.onImportPreview}
      >
        Preview import
      </Button>
      <Popconfirm
        cancelText="Cancel"
        description="Rows marked error, duplicate, or blocked will stop the import."
        okText="Import"
        onConfirm={props.onImport}
        title="Import default locale?"
      >
        <Button
          icon={<UploadOutlined />}
          loading={props.loadingAction === "import"}
        >
          Import default locale
        </Button>
      </Popconfirm>
      <Button
        icon={<FileSearchOutlined />}
        loading={props.loadingAction === "export"}
        onClick={props.onExportPreview}
      >
        Preview export
      </Button>
      <Button
        icon={<DownloadOutlined />}
        loading={props.loadingAction === "download"}
        onClick={props.onExportDownload}
      >
        Export JSON
      </Button>
    </Space>
  );
}
