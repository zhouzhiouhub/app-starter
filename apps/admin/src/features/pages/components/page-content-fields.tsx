import { Form, Input, Typography } from "antd";
import type { PageSchema } from "@app-starter/schema";
import { readPublishPreflightFieldProps } from "../publish-preflight-field-focus";
import { updatePageMetaTitle } from "../section-content-updates";

export function PageContentFields(props: {
  highlightedField: string | null;
  onChange: (schema: PageSchema) => void;
  schema: PageSchema;
}) {
  function patch(updater: (current: PageSchema) => PageSchema) {
    props.onChange(updater(props.schema));
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
      <Typography.Title level={4}>Page</Typography.Title>
      <Form layout="vertical">
        <div
          {...readPublishPreflightFieldProps(
            "meta.title",
            props.highlightedField,
          )}
        >
          <Form.Item label="Page title">
            <Input
              onChange={(event) =>
                patch((current) =>
                  updatePageMetaTitle(current, event.target.value),
                )
              }
              value={props.schema.meta.title}
            />
          </Form.Item>
        </div>
      </Form>
    </section>
  );
}
