import { Form, Input, Typography } from "antd";
import type { PageSchema } from "@app-starter/schema";
import { ChromeBrandFields } from "./chrome-brand-fields";
import { ChromeNavigationList } from "./chrome-navigation-list";

export function ChromeFooterContentFields(props: {
  highlightedField: string | null;
  onAddNavigation: () => void;
  onBrandChange: (field: "label" | "href" | "logoSrc", value: string) => void;
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
      <ChromeBrandFields
        brand={footer.brand}
        fieldPathPrefix="chrome.footer.content.brand"
        highlightedField={props.highlightedField}
        onBrandChange={props.onBrandChange}
      />
      <Form.Item label="Copyright">
        <Input
          onChange={(event) => props.onCopyrightChange(event.target.value)}
          value={footer.copyright.defaultValue}
        />
      </Form.Item>
      <Typography.Text strong>Footer links</Typography.Text>
      <ChromeNavigationList
        addLabel="Add footer link"
        fieldPathPrefix="chrome.footer.content.navigation"
        highlightedField={props.highlightedField}
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
