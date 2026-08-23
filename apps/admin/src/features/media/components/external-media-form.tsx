import { Form, Input, InputNumber, Select } from "antd";
import type { FormInstance } from "antd";
import { mediaMimeTypeOptions } from "../constants";
import { readExternalMediaUrlError } from "../external-media-url-validation";
import { readMediaFilenameError } from "../media-filename-validation";
import {
  MEDIA_MAX_UPLOAD_BYTES,
  mediaMaxUploadSizeLabel,
} from "../media-upload-validation";
import type { RegisterMediaInput } from "../types";

export function ExternalMediaForm(props: {
  form: FormInstance<RegisterMediaInput>;
  onSubmit: (values: RegisterMediaInput) => void;
}) {
  return (
    <Form
      form={props.form}
      layout="vertical"
      onFinish={props.onSubmit}
      preserve={false}
    >
      <Form.Item
        label="Asset URL"
        name="url"
        rules={[
          { required: true, message: "Enter an asset URL." },
          {
            validator: async (_rule, value: string | undefined) => {
              const urlError = readExternalMediaUrlError(value);

              if (urlError) {
                throw new Error(urlError);
              }
            },
          },
        ]}
      >
        <Input placeholder="https://assets.brand-platform.com/hero.webp" />
      </Form.Item>
      <Form.Item
        label="Filename"
        name="filename"
        rules={[
          { required: true, message: "Enter a filename." },
          {
            validator: async (_rule, value: string | undefined) => {
              const filenameError = readMediaFilenameError(value);

              if (filenameError) {
                throw new Error(filenameError);
              }
            },
          },
        ]}
      >
        <Input placeholder="hero.webp" />
      </Form.Item>
      <Form.Item
        initialValue="image/webp"
        label="MIME type"
        name="mimeType"
        rules={[{ required: true, message: "Select a MIME type." }]}
      >
        <Select options={mediaMimeTypeOptions} />
      </Form.Item>
      <Form.Item
        initialValue={1}
        label="Size"
        name="size"
        extra={`Maximum ${mediaMaxUploadSizeLabel}.`}
        rules={[{ required: true, message: "Enter the file size." }]}
      >
        <InputNumber
          max={MEDIA_MAX_UPLOAD_BYTES}
          min={1}
          precision={0}
          style={{ width: "100%" }}
        />
      </Form.Item>
      <Form.Item label="Alt text" name="altText">
        <Input placeholder="Descriptive image text" />
      </Form.Item>
    </Form>
  );
}
