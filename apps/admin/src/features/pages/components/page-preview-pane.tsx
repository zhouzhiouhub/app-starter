import { useMemo } from "react";
import { Alert, Segmented, Typography } from "antd";
import { PageRenderer } from "@app-starter/renderer";
import {
  collectMediaReferences,
  type PageSchema,
  type Viewport,
} from "@app-starter/schema";
import { readMediaResolverFeedback } from "../../media/media-resolver-feedback";
import { useMediaResolver } from "../../media/hooks/use-media-resolver";

export function PagePreviewPane(props: {
  schema: PageSchema;
  onViewportChange: (viewport: Viewport) => void;
  viewport: Viewport;
}) {
  const mediaResolver = useMediaResolver();
  const mediaReferences = useMemo(
    () => collectMediaReferences(props.schema),
    [props.schema],
  );
  const mediaFeedback = readMediaResolverFeedback({
    error: mediaResolver.error,
    isLoading: mediaResolver.isLoading,
    references: mediaReferences,
    urlsByReference: mediaResolver.urlsByReference,
  });

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
      {mediaFeedback ? (
        <Alert
          description={mediaFeedback.description}
          message={mediaFeedback.message}
          showIcon
          style={{ marginBottom: 16 }}
          type={mediaFeedback.type}
        />
      ) : null}
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
          resolveMediaUrl={mediaResolver.resolveMediaUrl}
          schema={props.schema}
          viewport={props.viewport}
        />
      </div>
    </section>
  );
}
