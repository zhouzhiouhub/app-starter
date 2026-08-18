import { Button, Space } from "antd";
import { SaveOutlined, UploadOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";

export function PageEditorToolbar(props: {
  isPublishing: boolean;
  isSaving: boolean;
  onPublish: () => void;
  onSaveDraft: () => void;
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
    </Space>
  );
}
