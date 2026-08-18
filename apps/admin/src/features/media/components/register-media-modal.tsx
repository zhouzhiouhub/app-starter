import { PlusOutlined } from "@ant-design/icons";
import {
  Alert,
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
} from "antd";
import { useState } from "react";
import { mediaMimeTypeOptions } from "../constants";
import { registerMediaAsset } from "../api";
import type { RegisterMediaInput } from "../types";

export function RegisterMediaModal(props: { onCreated: () => void }) {
  const [form] = Form.useForm<RegisterMediaInput>();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(values: RegisterMediaInput) {
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

  return (
    <>
      <Button
        icon={<PlusOutlined />}
        onClick={() => setOpen(true)}
        type="primary"
      >
        Register asset
      </Button>
      <Modal
        confirmLoading={isSubmitting}
        destroyOnClose
        onCancel={() => setOpen(false)}
        onOk={() => void form.submit()}
        open={open}
        title="Register asset"
      >
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          {error ? <Alert message={error} showIcon type="error" /> : null}
          <Form
            form={form}
            layout="vertical"
            onFinish={(values) => void submit(values)}
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
              rules={[{ required: true, message: "Enter a filename." }]}
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
              rules={[{ required: true, message: "Enter the file size." }]}
            >
              <InputNumber min={1} precision={0} style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item label="Alt text" name="altText">
              <Input placeholder="Descriptive image text" />
            </Form.Item>
          </Form>
        </Space>
      </Modal>
    </>
  );
}
