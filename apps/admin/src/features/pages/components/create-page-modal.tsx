import { Button, Form, Input, Modal, Select } from "antd";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { PageTemplateId } from "@app-starter/schema";
import { AuthRequiredError } from "../../auth/api";
import { formatRequestError } from "../../../lib/api-error";
import { createPage } from "../api";
import { pageTemplateOptions } from "../constants";

interface CreatePageFormValues {
  slug: string;
  templateId: PageTemplateId;
  title: string;
}

export function CreatePageModal() {
  const navigate = useNavigate();
  const [form] = Form.useForm<CreatePageFormValues>();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(values: CreatePageFormValues) {
    setIsSubmitting(true);
    setError(null);

    try {
      const page = await createPage({
        slug: values.slug.trim(),
        templateId: values.templateId,
        title: values.title.trim(),
      });
      setOpen(false);
      form.resetFields();
      navigate(`/pages/${page.id}`);
    } catch (caught) {
      if (caught instanceof AuthRequiredError) {
        globalThis.location.assign("/login");
        return;
      }

      setError(formatRequestError(caught));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} type="primary">
        New page
      </Button>
      <Modal
        confirmLoading={isSubmitting}
        okText="Create"
        onCancel={() => setOpen(false)}
        onOk={() => void form.submit()}
        open={open}
        title="Create page"
      >
        <Form<CreatePageFormValues>
          form={form}
          initialValues={{ templateId: "default" }}
          layout="vertical"
          onFinish={(values) => void submit(values)}
        >
          <Form.Item
            label="Title"
            name="title"
            rules={[{ max: 255, required: true }]}
          >
            <Input placeholder="Home" />
          </Form.Item>
          <Form.Item
            extra="Lowercase letters, numbers, hyphens, or slashes. Example: home or privacy-policy."
            label="Slug"
            name="slug"
            rules={[
              { required: true },
              {
                message:
                  "Slug must be lowercase letters, numbers, hyphens, or slashes.",
                pattern: /^[a-z0-9]+(?:[-/][a-z0-9]+)*$/,
              },
            ]}
          >
            <Input placeholder="home" />
          </Form.Item>
          <Form.Item label="Template" name="templateId" rules={[{ required: true }]}>
            <Select options={pageTemplateOptions} />
          </Form.Item>
          {error ? (
            <Form.Item>
              <div style={{ color: "#ff4d4f" }}>{error}</div>
            </Form.Item>
          ) : null}
        </Form>
      </Modal>
    </>
  );
}
