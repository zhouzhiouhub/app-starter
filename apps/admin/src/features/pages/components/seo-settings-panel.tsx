import { Form, Input, Switch, Typography } from "antd";
import {
  isMediaAssetReference,
  type PageSchema,
} from "@app-starter/schema";
import { MediaAssetSelect } from "../../media/components/media-asset-select";
import { readPublishPreflightFieldProps } from "../publish-preflight-field-focus";
import { readSeoFieldFeedback } from "../seo-feedback";
import {
  updateSeoField,
  updateSeoNoIndex,
  type SeoField,
} from "../seo-updates";

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
    placeholder: "media://asset-id or https://cdn.example.com/image.jpg",
  },
];

export function SeoSettingsPanel(props: {
  highlightedField: string | null;
  onChange: (schema: PageSchema) => void;
  schema: PageSchema;
}) {
  function handleChange(field: SeoField, value: string) {
    props.onChange(updateSeoField(props.schema, field, value));
  }

  function handleIndexingChange(checked: boolean) {
    props.onChange(updateSeoNoIndex(props.schema, !checked));
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
        <Form.Item label="Search indexing">
          <Switch
            checked={!props.schema.seo.noIndex}
            checkedChildren="Index"
            onChange={handleIndexingChange}
            unCheckedChildren="No index"
          />
        </Form.Item>
        {seoFields.map((item) => {
          const value = props.schema.seo[item.field] ?? "";
          const feedback = readSeoFieldFeedback(item.field, value);
          const publishField = `seo.${item.field}`;

          return (
            <div
              key={item.field}
              {...readPublishPreflightFieldProps(
                publishField,
                props.highlightedField,
              )}
            >
              <Form.Item
                help={feedback.help}
                label={item.label}
                validateStatus={feedback.status}
              >
                {item.rows ? (
                  <Input.TextArea
                    onChange={(event) =>
                      handleChange(item.field, event.target.value)
                    }
                    placeholder={item.placeholder}
                    rows={item.rows}
                    value={value}
                  />
                ) : item.field === "ogImage" ? (
                  <>
                    <Input
                      onChange={(event) =>
                        handleChange(item.field, event.target.value)
                      }
                      placeholder={item.placeholder}
                      style={{ marginBottom: 8 }}
                      value={value}
                    />
                    <MediaAssetSelect
                      onSelect={(asset) =>
                        handleChange(item.field, asset.reference)
                      }
                      value={
                        isMediaAssetReference(value)
                          ? props.schema.seo[item.field]
                          : undefined
                      }
                    />
                  </>
                ) : (
                  <Input
                    onChange={(event) =>
                      handleChange(item.field, event.target.value)
                    }
                    placeholder={item.placeholder}
                    value={value}
                  />
                )}
              </Form.Item>
            </div>
          );
        })}
      </Form>
    </section>
  );
}
