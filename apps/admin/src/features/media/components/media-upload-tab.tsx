import { InboxOutlined } from "@ant-design/icons";
import { Input, Space, Upload } from "antd";
import { mediaMimeTypeOptions } from "../constants";
import { readMediaUploadFileError } from "../media-upload-validation";

export function MediaUploadTab(props: {
  altText: string;
  onAltTextChange: (value: string) => void;
  onError: (error: string | null) => void;
  onSelectedFileChange: (file: File | null) => void;
  selectedFile: File | null;
}) {
  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Upload.Dragger
        accept={mediaMimeTypeOptions.map((item) => item.value).join(",")}
        beforeUpload={(file) => {
          const fileError = readMediaUploadFileError(file);

          if (fileError) {
            props.onSelectedFileChange(null);
            props.onError(fileError);
            return Upload.LIST_IGNORE;
          }

          props.onSelectedFileChange(file);
          props.onError(null);
          return false;
        }}
        fileList={
          props.selectedFile
            ? [
                {
                  name: props.selectedFile.name,
                  size: props.selectedFile.size,
                  status: "done",
                  type: props.selectedFile.type,
                  uid: props.selectedFile.name,
                },
              ]
            : []
        }
        maxCount={1}
        onRemove={() => {
          props.onSelectedFileChange(null);
          return true;
        }}
      >
        <p className="ant-upload-drag-icon">
          <InboxOutlined />
        </p>
        <p className="ant-upload-text">Choose a media file</p>
      </Upload.Dragger>
      <Input
        onChange={(event) => props.onAltTextChange(event.target.value)}
        placeholder="Alt text"
        value={props.altText}
      />
    </Space>
  );
}
