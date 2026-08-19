import {
  AuditOutlined,
  EyeOutlined,
  ExportOutlined,
  RedoOutlined,
  SaveOutlined,
  UndoOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import { Button, Space, Tooltip } from "antd";
import { useNavigate } from "react-router-dom";
import { buildPageAuditLogPath } from "../audit-log-link";
import { getStorefrontPageUrl } from "../storefront-url";

export function PageEditorToolbar(props: {
  canRedo: boolean;
  canUndo: boolean;
  isDraftDirty: boolean;
  isPublishing: boolean;
  isCreatingPreview: boolean;
  isSaving: boolean;
  onOpenPreview: () => void;
  onPublish: () => void;
  onRedo: () => void;
  onSaveDraft: () => void;
  onUndo: () => void;
  pageId: string;
  published: boolean;
  slug: string;
}) {
  const navigate = useNavigate();

  return (
    <Space>
      <Button onClick={() => navigate("/pages")}>Back to list</Button>
      <Tooltip title="Undo">
        <Button
          aria-label="Undo"
          disabled={!props.canUndo}
          icon={<UndoOutlined />}
          onClick={props.onUndo}
        />
      </Tooltip>
      <Tooltip title="Redo">
        <Button
          aria-label="Redo"
          disabled={!props.canRedo}
          icon={<RedoOutlined />}
          onClick={props.onRedo}
        />
      </Tooltip>
      <Tooltip
        title={props.isDraftDirty ? "Save draft" : "No draft changes to save"}
      >
        <Button
          disabled={!props.isDraftDirty}
          icon={<SaveOutlined />}
          loading={props.isSaving}
          onClick={props.onSaveDraft}
        >
          Save draft
        </Button>
      </Tooltip>
      <Button
        icon={<EyeOutlined />}
        loading={props.isCreatingPreview}
        onClick={props.onOpenPreview}
      >
        Preview
      </Button>
      <Button
        icon={<UploadOutlined />}
        loading={props.isPublishing}
        onClick={props.onPublish}
        type="primary"
      >
        Publish
      </Button>
      <Button
        icon={<AuditOutlined />}
        onClick={() => navigate(buildPageAuditLogPath(props.pageId))}
      >
        Audit logs
      </Button>
      <Button
        disabled={!props.published}
        href={getStorefrontPageUrl(props.slug)}
        icon={<ExportOutlined />}
        rel="noreferrer"
        target="_blank"
      >
        View on site
      </Button>
    </Space>
  );
}
