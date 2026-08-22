import { useState } from "react";
import { PlusOutlined } from "@ant-design/icons";
import { Button, Select, Space, Typography } from "antd";
import type { PageSchema } from "@app-starter/schema";
import {
  addSection,
  sectionTemplateOptions,
  type SectionTemplateId,
} from "../section-management-updates";

export function SectionLibraryPanel(props: {
  onChange: (schema: PageSchema) => void;
  onSelect: (sectionId: string) => void;
  schema: PageSchema;
}) {
  const [templateId, setTemplateId] =
    useState<SectionTemplateId>("hero-banner");

  function handleAdd() {
    const result = addSection(props.schema, templateId);
    props.onChange(result.schema);
    props.onSelect(result.sectionId);
  }

  return (
    <section
      style={{
        background: "#fff",
        border: "1px solid #eee",
        borderRadius: 8,
        marginBottom: 24,
        padding: 20,
      }}
    >
      <Typography.Title level={4}>Add section</Typography.Title>
      <Space.Compact block>
        <Select
          onChange={(value) => setTemplateId(value)}
          optionRender={(option) => (
            <div>
              <div>{option.label}</div>
              <Typography.Text type="secondary">
                {option.data.description}
              </Typography.Text>
            </div>
          )}
          options={sectionTemplateOptions}
          style={{ width: "100%" }}
          value={templateId}
        />
        <Button icon={<PlusOutlined />} onClick={handleAdd} type="primary">
          Add
        </Button>
      </Space.Compact>
    </section>
  );
}
