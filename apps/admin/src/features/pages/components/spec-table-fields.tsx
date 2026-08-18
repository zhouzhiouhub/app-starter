import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { Button, Empty, Form, Input, Space, Tooltip } from "antd";
import type { PageSchema, SectionNode } from "@app-starter/schema";
import {
  addSpecRow,
  readSpecRows,
  removeSpecRow,
  updateSpecRow,
} from "../section-list-prop-updates";

export function SpecTableFields(props: {
  onChange: (schema: PageSchema) => void;
  schema: PageSchema;
  section: SectionNode;
}) {
  const rows = readSpecRows(props.section);

  return (
    <Form.Item label="Rows">
      <Space direction="vertical" style={{ width: "100%" }}>
        {rows.length === 0 ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} /> : null}
        {rows.map((row, index) => (
          <Space.Compact block key={`${index}-${row.label}`}>
            <Input
              onChange={(event) =>
                props.onChange(
                  updateSpecRow(
                    props.schema,
                    props.section.id,
                    index,
                    "label",
                    event.target.value,
                  ),
                )
              }
              placeholder="Label"
              value={row.label}
            />
            <Input
              onChange={(event) =>
                props.onChange(
                  updateSpecRow(
                    props.schema,
                    props.section.id,
                    index,
                    "value",
                    event.target.value,
                  ),
                )
              }
              placeholder="Value"
              value={row.value}
            />
            <Tooltip title="Remove">
              <Button
                danger
                icon={<DeleteOutlined />}
                onClick={() =>
                  props.onChange(
                    removeSpecRow(props.schema, props.section.id, index),
                  )
                }
              />
            </Tooltip>
          </Space.Compact>
        ))}
        <Button
          icon={<PlusOutlined />}
          onClick={() =>
            props.onChange(addSpecRow(props.schema, props.section.id))
          }
        >
          Add row
        </Button>
      </Space>
    </Form.Item>
  );
}
