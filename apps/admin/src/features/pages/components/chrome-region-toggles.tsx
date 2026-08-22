import { Select, Space, Switch, Typography } from "antd";
import type { PageChromeSettings, PageSchema } from "@app-starter/schema";
import type { ChromeRegionKey } from "../chrome-region";

export function ChromeRegionToggles(props: {
  schema: PageSchema;
  onEnabledChange: (region: ChromeRegionKey, enabled: boolean) => void;
  onVariantChange: (
    region: ChromeRegionKey,
    variant: PageChromeSettings[ChromeRegionKey]["variant"],
  ) => void;
}) {
  return (
    <Space direction="vertical" size={18} style={{ width: "100%" }}>
      <ChromeRegionToggle
        enabled={props.schema.chrome.header.enabled}
        label="Header"
        onEnabledChange={(enabled) => props.onEnabledChange("header", enabled)}
        onVariantChange={(variant) => props.onVariantChange("header", variant)}
        variant={props.schema.chrome.header.variant}
      />
      <ChromeRegionToggle
        enabled={props.schema.chrome.footer.enabled}
        label="Footer"
        onEnabledChange={(enabled) => props.onEnabledChange("footer", enabled)}
        onVariantChange={(variant) => props.onVariantChange("footer", variant)}
        variant={props.schema.chrome.footer.variant}
      />
    </Space>
  );
}

function ChromeRegionToggle(props: {
  enabled: boolean;
  label: string;
  onEnabledChange: (enabled: boolean) => void;
  onVariantChange: (
    variant: PageChromeSettings[ChromeRegionKey]["variant"],
  ) => void;
  variant: PageChromeSettings[ChromeRegionKey]["variant"];
}) {
  return (
    <div>
      <Typography.Text strong>{props.label}</Typography.Text>
      <div
        style={{
          alignItems: "center",
          display: "grid",
          gap: 12,
          gridTemplateColumns: "1fr auto",
        }}
      >
        <Select
          disabled={!props.enabled}
          onChange={props.onVariantChange}
          options={[
            { label: "Default", value: "default" },
            { label: "Minimal", value: "minimal" },
          ]}
          value={props.variant}
        />
        <Switch checked={props.enabled} onChange={props.onEnabledChange} />
      </div>
    </div>
  );
}
