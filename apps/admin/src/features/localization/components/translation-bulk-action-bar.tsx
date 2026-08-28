import {
  DownloadOutlined,
  FileAddOutlined,
  FileSearchOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import { Button, Popconfirm, Space } from "antd";
import type { TranslationBulkLoadingAction } from "../translation-bulk-action";

export function TranslationBulkActionBar(props: {
  hasMissingKeyDraft: boolean;
  importConfirmationSummary: string;
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
        description={props.importConfirmationSummary}
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
