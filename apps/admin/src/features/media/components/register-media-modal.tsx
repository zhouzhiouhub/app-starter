import { InboxOutlined, LinkOutlined, PlusOutlined } from "@ant-design/icons";
import {
  Alert,
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Tabs,
  Upload,
} from "antd";
import { useState } from "react";
import { mediaMimeTypeOptions } from "../constants";
import { registerMediaAsset, uploadMediaFile } from "../api";
import type { RegisterMediaInput } from "../types";

type MediaModalMode = "upload" | "external";

export function RegisterMediaModal(props: { onCreated: () => void }) {
  const [form] = Form.useForm<RegisterMediaInput>();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<MediaModalMode>("upload");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadAltText, setUploadAltText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitExternal(values: RegisterMediaInput) {
    setIsSubmitting(true);
    setError(null);

    try {
      await registerMediaAsset(values);
      form.resetFields();
      setOpen(false);
      props.onCreated();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Media asset could not be registered.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submitUpload() {
    if (!selectedFile) {
      setError("Choose a file to upload.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await uploadMediaFile({
        altText: uploadAltText,
        file: selectedFile,
      });
      resetAndClose();
      props.onCreated();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Media upload failed.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function resetAndClose() {
    form.resetFields();
    setSelectedFile(null);
    setUploadAltText("");
    setOpen(false);
  }

  return (
    <>
      <Button
        icon={<PlusOutlined />}
        onClick={() => setOpen(true)}
        type="primary"
      >
        Upload asset
      </Button>
      <Modal
        confirmLoading={isSubmitting}
        destroyOnClose
        onCancel={resetAndClose}
        onOk={() =>
          mode === "upload" ? void submitUpload() : void form.submit()
        }
        open={open}
        title="Upload asset"
      >
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          {error ? <Alert message={error} showIcon type="error" /> : null}
          <Tabs
            activeKey={mode}
            items={[
              {
                children: (
                  <Space direction="vertical" size={16} style={{ width: "100%" }}>
                    <Upload.Dragger
                      accept={mediaMimeTypeOptions
                        .map((item) => item.value)
                        .join(",")}
                      beforeUpload={(file) => {
                        setSelectedFile(file);
                        setError(null);
                        return false;
                      }}
                      fileList={
                        selectedFile
                          ? [
                              {
                                name: selectedFile.name,
                                size: selectedFile.size,
                                status: "done",
                                type: selectedFile.type,
                                uid: selectedFile.name,
                              },
                            ]
                          : []
                      }
                      maxCount={1}
                      onRemove={() => {
                        setSelectedFile(null);
                        return true;
                      }}
                    >
                      <p className="ant-upload-drag-icon">
                        <InboxOutlined />
                      </p>
                      <p className="ant-upload-text">Choose a media file</p>
                    </Upload.Dragger>
                    <Input
                      onChange={(event) => setUploadAltText(event.target.value)}
                      placeholder="Alt text"
                      value={uploadAltText}
                    />
                  </Space>
                ),
                icon: <InboxOutlined />,
                key: "upload",
                label: "Upload",
              },
              {
                children: (
                  <Form
                    form={form}
                    layout="vertical"
                    onFinish={(values) => void submitExternal(values)}
                    preserve={false}
                  >
                    <Form.Item
                      label="Asset URL"
                      name="url"
                      rules={[
                        { required: true, message: "Enter an asset URL." },
                        { type: "url", message: "Enter a valid URL." },
                      ]}
                    >
                      <Input placeholder="https://cdn.example.com/hero.webp" />
                    </Form.Item>
                    <Form.Item
                      label="Filename"
                      name="filename"
                      rules={[
                        { required: true, message: "Enter a filename." },
                      ]}
                    >
                      <Input placeholder="hero.webp" />
                    </Form.Item>
                    <Form.Item
                      initialValue="image/webp"
                      label="MIME type"
                      name="mimeType"
                      rules={[
                        { required: true, message: "Select a MIME type." },
                      ]}
                    >
                      <Select options={mediaMimeTypeOptions} />
                    </Form.Item>
                    <Form.Item
                      initialValue={1}
                      label="Size"
                      name="size"
                      rules={[
                        { required: true, message: "Enter the file size." },
                      ]}
                    >
                      <InputNumber
                        min={1}
                        precision={0}
                        style={{ width: "100%" }}
                      />
                    </Form.Item>
                    <Form.Item label="Alt text" name="altText">
                      <Input placeholder="Descriptive image text" />
                    </Form.Item>
                  </Form>
                ),
                icon: <LinkOutlined />,
                key: "external",
                label: "External URL",
              },
            ]}
            onChange={(value) => {
              setMode(value as MediaModalMode);
              setError(null);
            }}
          />
        </Space>
      </Modal>
    </>
  );
}
