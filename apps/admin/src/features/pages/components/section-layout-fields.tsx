import { CopyOutlined } from "@ant-design/icons";
import {
  Button,
  Form,
  Input,
  InputNumber,
  Space,
  Switch,
  Typography,
} from "antd";
import type { PageSchema, SectionNode, Viewport } from "@app-starter/schema";
import {
  copyDesktopLayoutToMobile,
  readSectionLayout,
  updateSectionLayoutField,
  updateSectionLayoutTextField,
  updateSectionVisibility,
  type SectionLayoutField,
  type SectionLayoutTextField,
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

const textFields: Array<{
  field: SectionLayoutTextField;
  label: string;
  placeholder: string;
}> = [
  { field: "padding", label: "Padding", placeholder: "24px 40px" },
  { field: "gap", label: "Gap", placeholder: "16px" },
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
      <div
        style={{
          alignItems: "center",
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <Typography.Title level={5}>
          {props.viewport === "desktop" ? "Desktop" : "Mobile"} layout
        </Typography.Title>
        {props.viewport === "mobile" ? (
          <Button
            icon={<CopyOutlined />}
            onClick={() =>
              props.onChange(
                copyDesktopLayoutToMobile(props.schema, props.section.id),
              )
            }
            size="small"
          >
            Copy desktop
          </Button>
        ) : null}
      </div>
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
      <Space style={{ width: "100%" }} wrap>
        {textFields.map((item) => (
          <Form.Item key={item.field} label={item.label}>
            <Input
              onChange={(event) =>
                props.onChange(
                  updateSectionLayoutTextField(
                    props.schema,
                    props.section.id,
                    props.viewport,
                    item.field,
                    event.target.value,
                  ),
                )
              }
              placeholder={item.placeholder}
              style={{ width: 160 }}
              value={layout[item.field] ?? ""}
            />
          </Form.Item>
        ))}
      </Space>
    </>
  );
}
