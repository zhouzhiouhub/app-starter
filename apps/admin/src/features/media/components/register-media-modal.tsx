import { InboxOutlined, LinkOutlined, PlusOutlined } from "@ant-design/icons";
import { Alert, Button, Form, Modal, Space, Tabs } from "antd";
import { useState } from "react";
import { registerMediaAsset, uploadMediaFile } from "../api";
import type { RegisterMediaInput } from "../types";
import { ExternalMediaForm } from "./external-media-form";
import { MediaUploadTab } from "./media-upload-tab";

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
                  <MediaUploadTab
                    altText={uploadAltText}
                    onAltTextChange={setUploadAltText}
                    onError={setError}
                    onSelectedFileChange={setSelectedFile}
                    selectedFile={selectedFile}
                  />
                ),
                icon: <InboxOutlined />,
                key: "upload",
                label: "Upload",
              },
              {
                children: (
                  <ExternalMediaForm
                    form={form}
                    onSubmit={(values) => void submitExternal(values)}
                  />
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
