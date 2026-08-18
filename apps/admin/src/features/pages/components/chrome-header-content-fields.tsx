import { Form, Input, Typography } from "antd";
import type { PageSchema } from "@app-starter/schema";
import { ChromeNavigationList } from "./chrome-navigation-list";

export function ChromeHeaderContentFields(props: {
  onAddNavigation: () => void;
  onBrandChange: (field: "label" | "href", value: string) => void;
  onNavigationChange: (
    index: number,
    field: "label" | "href",
    value: string,
  ) => void;
  onRemoveNavigation: (index: number) => void;
  schema: PageSchema;
}) {
  const header = props.schema.chrome.header.content;

  return (
    <>
      <Typography.Title level={5}>Header content</Typography.Title>
      <Form.Item label="Brand text">
        <Input
          onChange={(event) => props.onBrandChange("label", event.target.value)}
          value={header.brand.label.defaultValue}
        />
      </Form.Item>
      <Form.Item label="Brand link">
        <Input
          onChange={(event) => props.onBrandChange("href", event.target.value)}
          value={header.brand.href}
        />
      </Form.Item>
      <Typography.Text strong>Menu items</Typography.Text>
      <ChromeNavigationList
        addLabel="Add menu item"
        hrefAriaLabel="Header menu link"
        items={header.navigation}
        labelAriaLabel="Header menu label"
        onAdd={props.onAddNavigation}
        onChange={props.onNavigationChange}
        onRemove={props.onRemoveNavigation}
        removeAriaLabel="Remove header menu item"
      />
    </>
  );
}
