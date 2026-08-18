import { Form, InputNumber, Space, Switch, Typography } from "antd";
import type { PageSchema, SectionNode, Viewport } from "@app-starter/schema";
import {
  readSectionLayout,
  updateSectionLayoutField,
  updateSectionVisibility,
  type SectionLayoutField,
} from "../section-layout-updates";

const numericFields: Array<{
  field: SectionLayoutField;
  label: string;
  min: number;
}> = [
  { field: "x", label: "X", min: 0 },
  { field: "y", label: "Y", min: 0 },
  { field: "width", label: "Width", min: 1 },
  { field: "height", label: "Height", min: 1 },
];

export function SectionLayoutFields(props: {
  onChange: (schema: PageSchema) => void;
  schema: PageSchema;
  section: SectionNode;
  viewport: Viewport;
}) {
  const layout = readSectionLayout(props.section, props.viewport);
  const visible = props.section.visibility?.[props.viewport] !== false;

  return (
    <>
      <Typography.Title level={5}>
        {props.viewport === "desktop" ? "Desktop" : "Mobile"} layout
      </Typography.Title>
      <Form.Item label="Visibility">
        <Switch
          checked={visible}
          checkedChildren="Visible"
          onChange={(checked) =>
            props.onChange(
              updateSectionVisibility(
                props.schema,
                props.section.id,
                props.viewport,
                checked,
              ),
            )
          }
          unCheckedChildren="Hidden"
        />
      </Form.Item>
      <Space style={{ width: "100%" }} wrap>
        {numericFields.map((item) => (
          <Form.Item key={item.field} label={item.label}>
            <InputNumber
              min={item.min}
              onChange={(value) => {
                if (typeof value !== "number") {
                  return;
                }

                props.onChange(
                  updateSectionLayoutField(
                    props.schema,
                    props.section.id,
                    props.viewport,
                    item.field,
                    value,
                  ),
                );
              }}
              value={layout[item.field]}
            />
          </Form.Item>
        ))}
      </Space>
    </>
  );
}
