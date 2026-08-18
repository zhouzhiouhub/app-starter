import { ExportOutlined, SaveOutlined, UploadOutlined } from "@ant-design/icons";
import { Button, Space } from "antd";
import { useNavigate } from "react-router-dom";
import { getStorefrontPageUrl } from "../storefront-url";

export function PageEditorToolbar(props: {
  isPublishing: boolean;
  isSaving: boolean;
  onPublish: () => void;
  onSaveDraft: () => void;
  published: boolean;
  slug: string;
}) {
  const navigate = useNavigate();

  return (
    <Space>
      <Button onClick={() => navigate("/pages")}>Back to list</Button>
      <Button
        icon={<SaveOutlined />}
        loading={props.isSaving}
        onClick={props.onSaveDraft}
      >
        Save draft
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
