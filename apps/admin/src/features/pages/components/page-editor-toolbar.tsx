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
import { readStorefrontPageUrl } from "../storefront-url";

export function PageEditorToolbar(props: {
  canRedo: boolean;
  canUndo: boolean;
  isDraftDirty: boolean;
  isPublishing: boolean;
  isCreatingPreview: boolean;
  isSaving: boolean;
  locale: string;
  onOpenPreview: () => void;
  onPublish: () => void;
  onRedo: () => void;
  onSaveDraft: () => void;
  onUndo: () => void;
  pageId: string;
  publishDisabled: boolean;
  published: boolean;
  siteDomain: string;
  slug: string;
}) {
  const navigate = useNavigate();
  const publishTitle = props.publishDisabled
    ? "Resolve publish errors before publishing"
    : "Publish";
  const storefrontUrl = readStorefrontPageUrl({
    locale: props.locale,
    siteDomain: props.siteDomain,
    slug: props.slug,
  });
  const viewDisabled = !props.published || !storefrontUrl.ok;
  const viewTitle = !props.published
    ? "Publish this page before viewing it on the storefront"
    : storefrontUrl.ok
      ? "View on site"
      : storefrontUrl.message;

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
      <Tooltip title={publishTitle}>
        <Button
          disabled={props.publishDisabled}
          icon={<UploadOutlined />}
          loading={props.isPublishing}
          onClick={props.onPublish}
          type="primary"
        >
          Publish
        </Button>
      </Tooltip>
      <Button
        icon={<AuditOutlined />}
        onClick={() => navigate(buildPageAuditLogPath(props.pageId))}
      >
        Audit logs
      </Button>
      <Button
        disabled={viewDisabled}
        href={storefrontUrl.ok ? storefrontUrl.href : undefined}
        icon={<ExportOutlined />}
        rel="noreferrer"
        target="_blank"
        title={viewTitle}
      >
        View on site
      </Button>
    </Space>
  );
}
