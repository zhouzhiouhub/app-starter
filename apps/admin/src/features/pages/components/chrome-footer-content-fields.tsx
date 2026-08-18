import { Form, Input, Typography } from "antd";
import type { PageSchema } from "@app-starter/schema";
import { ChromeNavigationList } from "./chrome-navigation-list";

export function ChromeFooterContentFields(props: {
  onAddNavigation: () => void;
  onBrandChange: (field: "label" | "href", value: string) => void;
  onCopyrightChange: (value: string) => void;
  onNavigationChange: (
    index: number,
    field: "label" | "href",
    value: string,
  ) => void;
  onRemoveNavigation: (index: number) => void;
  schema: PageSchema;
}) {
  const footer = props.schema.chrome.footer.content;

  return (
    <>
      <Typography.Title level={5}>Footer content</Typography.Title>
      <Form.Item label="Brand text">
        <Input
          onChange={(event) => props.onBrandChange("label", event.target.value)}
          value={footer.brand.label.defaultValue}
        />
      </Form.Item>
      <Form.Item label="Brand link">
        <Input
          onChange={(event) => props.onBrandChange("href", event.target.value)}
          value={footer.brand.href}
        />
      </Form.Item>
      <Form.Item label="Copyright">
        <Input
          onChange={(event) => props.onCopyrightChange(event.target.value)}
          value={footer.copyright.defaultValue}
        />
      </Form.Item>
      <Typography.Text strong>Footer links</Typography.Text>
      <ChromeNavigationList
        addLabel="Add footer link"
        hrefAriaLabel="Footer link URL"
        items={footer.navigation}
        labelAriaLabel="Footer link label"
        onAdd={props.onAddNavigation}
        onChange={props.onNavigationChange}
        onRemove={props.onRemoveNavigation}
        removeAriaLabel="Remove footer link"
      />
    </>
  );
}
