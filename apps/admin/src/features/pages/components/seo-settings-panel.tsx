import { Form, Input, Typography } from "antd";
import type { PageSchema } from "@app-starter/schema";
import { updateSeoField, type SeoField } from "../seo-updates";

const seoFields: Array<{
  field: SeoField;
  label: string;
  placeholder: string;
  rows?: number;
}> = [
  {
    field: "title",
    label: "SEO title",
    placeholder: "Search result title",
  },
  {
    field: "description",
    label: "SEO description",
    placeholder: "Search result description",
    rows: 4,
  },
  {
    field: "canonical",
    label: "Canonical URL",
    placeholder: "https://example.com/en/page",
  },
  {
    field: "ogImage",
    label: "Open Graph image",
    placeholder: "https://cdn.example.com/image.jpg",
  },
];

export function SeoSettingsPanel(props: {
  onChange: (schema: PageSchema) => void;
  schema: PageSchema;
}) {
  function handleChange(field: SeoField, value: string) {
    props.onChange(updateSeoField(props.schema, field, value));
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
      <Typography.Title level={4}>SEO</Typography.Title>
      <Form layout="vertical">
        {seoFields.map((item) => (
          <Form.Item key={item.field} label={item.label}>
            {item.rows ? (
              <Input.TextArea
                onChange={(event) =>
                  handleChange(item.field, event.target.value)
                }
                placeholder={item.placeholder}
                rows={item.rows}
                value={props.schema.seo[item.field] ?? ""}
              />
            ) : (
              <Input
                onChange={(event) =>
                  handleChange(item.field, event.target.value)
                }
                placeholder={item.placeholder}
                value={props.schema.seo[item.field] ?? ""}
              />
            )}
          </Form.Item>
        ))}
      </Form>
    </section>
  );
}
