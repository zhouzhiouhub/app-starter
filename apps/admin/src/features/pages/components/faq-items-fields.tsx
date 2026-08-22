import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import { Button, Empty, Form, Input, Space, Tooltip } from "antd";
import type { PageSchema, SectionNode } from "@app-starter/schema";
import {
  addFaqItem,
  readFaqItems,
  removeFaqItem,
  updateFaqItem,
} from "../section-list-prop-updates";

export function FaqItemsFields(props: {
  onChange: (schema: PageSchema) => void;
  schema: PageSchema;
  section: SectionNode;
}) {
  const items = readFaqItems(props.section);

  return (
    <Form.Item label="FAQ items">
      <Space direction="vertical" style={{ width: "100%" }}>
        {items.length === 0 ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} /> : null}
        {items.map((item, index) => (
          <Space
            align="start"
            direction="vertical"
            key={`${index}-${item.question}`}
            style={{ width: "100%" }}
          >
            <Input
              onChange={(event) =>
                props.onChange(
                  updateFaqItem(
                    props.schema,
                    props.section.id,
                    index,
                    "question",
                    event.target.value,
                  ),
                )
              }
              placeholder="Question"
              value={item.question}
            />
            <Space.Compact block>
              <Input.TextArea
                onChange={(event) =>
                  props.onChange(
                    updateFaqItem(
                      props.schema,
                      props.section.id,
                      index,
                      "answer",
                      event.target.value,
                    ),
                  )
                }
                placeholder="Answer"
                rows={3}
                value={item.answer}
              />
              <Tooltip title="Remove">
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() =>
                    props.onChange(
                      removeFaqItem(props.schema, props.section.id, index),
                    )
                  }
                />
              </Tooltip>
            </Space.Compact>
          </Space>
        ))}
        <Button
          icon={<PlusOutlined />}
          onClick={() =>
            props.onChange(addFaqItem(props.schema, props.section.id))
          }
        >
          Add FAQ
        </Button>
      </Space>
    </Form.Item>
  );
}
