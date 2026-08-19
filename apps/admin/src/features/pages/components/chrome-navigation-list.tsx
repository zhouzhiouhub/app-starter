import { Button, Form, Input, Space } from "antd";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import type { ChromeNavigationItem } from "@app-starter/schema";
import { readSafeHrefFeedback } from "../safe-href-feedback";

export function ChromeNavigationList(props: {
  addLabel: string;
  hrefAriaLabel: string;
  items: ChromeNavigationItem[];
  labelAriaLabel: string;
  onAdd: () => void;
  onChange: (index: number, field: "label" | "href", value: string) => void;
  onRemove: (index: number) => void;
  removeAriaLabel: string;
}) {
  return (
    <Space direction="vertical" size={12} style={{ marginTop: 12, width: "100%" }}>
      {props.items.map((item, index) => {
        const hrefFeedback = readSafeHrefFeedback(item.href);

        return (
          <div
            key={item.id}
            style={{
              alignItems: "start",
              display: "grid",
              gap: 8,
              gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr) auto",
            }}
          >
            <Input
              aria-label={props.labelAriaLabel}
              onChange={(event) =>
                props.onChange(index, "label", event.target.value)
              }
              value={item.label.defaultValue}
            />
            <Form.Item
              help={hrefFeedback.help}
              style={{ marginBottom: 0 }}
              validateStatus={hrefFeedback.status}
            >
              <Input
                aria-label={props.hrefAriaLabel}
                onChange={(event) =>
                  props.onChange(index, "href", event.target.value)
                }
                value={item.href}
              />
            </Form.Item>
            <Button
              aria-label={props.removeAriaLabel}
              danger
              icon={<DeleteOutlined />}
              onClick={() => props.onRemove(index)}
            />
          </div>
        );
      })}
      <Button icon={<PlusOutlined />} onClick={props.onAdd}>
        {props.addLabel}
      </Button>
    </Space>
  );
}
