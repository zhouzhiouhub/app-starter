import { Tag } from "antd";

export function PageEditorStatusTags(props: {
  isDraftDirty: boolean;
  pageStatus: string;
}) {
  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
      <Tag color={props.pageStatus === "published" ? "green" : "default"}>
        {props.pageStatus}
      </Tag>
      <Tag color={props.isDraftDirty ? "orange" : "default"}>
        {props.isDraftDirty ? "Unsaved draft" : "Draft saved"}
      </Tag>
      <Tag color="blue">DEFAULT_LOCALE=en-US</Tag>
      <Tag color="default">COMMERCE_ENABLED=false</Tag>
      <Tag color="default">MULTI_LOCALE_ENABLED=false</Tag>
    </div>
  );
}
