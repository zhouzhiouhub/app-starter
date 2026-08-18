import { Segmented, Typography } from "antd";
import { PageRenderer } from "@app-starter/renderer";
import type { PageSchema, Viewport } from "@app-starter/schema";
import { useMediaResolver } from "../../media/hooks/use-media-resolver";

export function PagePreviewPane(props: {
  schema: PageSchema;
  onViewportChange: (viewport: Viewport) => void;
  viewport: Viewport;
}) {
  const resolveMediaUrl = useMediaResolver();

  return (
    <section
      style={{
        background: "#fff",
        border: "1px solid #eee",
        borderRadius: 8,
        minWidth: 0,
        padding: 20,
      }}
    >
      <div
        style={{
          alignItems: "center",
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 16,
        }}
      >
        <Typography.Title level={4} style={{ margin: 0 }}>
          Preview
        </Typography.Title>
        <Segmented
          onChange={(value) => props.onViewportChange(value as Viewport)}
          options={[
            { label: "Desktop", value: "desktop" },
            { label: "Mobile", value: "mobile" },
          ]}
          value={props.viewport}
        />
      </div>
      <div
        style={{
          border: "1px solid #eee",
          margin: "0 auto",
          maxWidth: props.viewport === "mobile" ? 390 : "100%",
          minHeight: 480,
          overflow: "hidden",
        }}
      >
        <PageRenderer
          resolveMediaUrl={resolveMediaUrl}
          schema={props.schema}
          viewport={props.viewport}
        />
      </div>
    </section>
  );
}
