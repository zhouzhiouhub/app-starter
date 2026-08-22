import { Form, Input, Typography } from "antd";
import type { PageSchema } from "@app-starter/schema";
import { readPublishPreflightFieldProps } from "../publish-preflight-field-focus";
import { readSafeHrefFeedback } from "../safe-href-feedback";
import { ChromeNavigationList } from "./chrome-navigation-list";

export function ChromeHeaderContentFields(props: {
  highlightedField: string | null;
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
  const brandHrefFeedback = readSafeHrefFeedback(header.brand.href);

  return (
    <>
      <Typography.Title level={5}>Header content</Typography.Title>
      <Form.Item label="Brand text">
        <Input
          onChange={(event) => props.onBrandChange("label", event.target.value)}
          value={header.brand.label.defaultValue}
        />
      </Form.Item>
      <div
        {...readPublishPreflightFieldProps(
          "chrome.header.content.brand.href",
          props.highlightedField,
        )}
      >
        <Form.Item
          help={brandHrefFeedback.help}
          label="Brand link"
          validateStatus={brandHrefFeedback.status}
        >
          <Input
            onChange={(event) => props.onBrandChange("href", event.target.value)}
            value={header.brand.href}
          />
        </Form.Item>
      </div>
      <Typography.Text strong>Menu items</Typography.Text>
      <ChromeNavigationList
        addLabel="Add menu item"
        fieldPathPrefix="chrome.header.content.navigation"
        highlightedField={props.highlightedField}
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
