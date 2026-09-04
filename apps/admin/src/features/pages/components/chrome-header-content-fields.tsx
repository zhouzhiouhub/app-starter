import { Typography } from "antd";
import type { PageSchema } from "@app-starter/schema";
import { ChromeBrandFields } from "./chrome-brand-fields";
import { ChromeNavigationList } from "./chrome-navigation-list";

export function ChromeHeaderContentFields(props: {
  highlightedField: string | null;
  onAddNavigation: () => void;
  onBrandChange: (field: "label" | "href" | "logoSrc", value: string) => void;
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
      <ChromeBrandFields
        brand={header.brand}
        fieldPathPrefix="chrome.header.content.brand"
        highlightedField={props.highlightedField}
        onBrandChange={props.onBrandChange}
      />
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
