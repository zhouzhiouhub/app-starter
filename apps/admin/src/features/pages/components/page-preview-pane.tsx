import { ReloadOutlined } from "@ant-design/icons";
import { Alert, Button, Segmented, Space, Typography } from "antd";
import { PageRenderer } from "@app-starter/renderer";
import type {
  MediaAssetReference,
  PageSchema,
  Viewport,
} from "@app-starter/schema";
import { readMediaResolverFeedback } from "../../media/media-resolver-feedback";
import type { MediaResolverState } from "../../media/hooks/use-media-resolver";

export function PagePreviewPane(props: {
  mediaReferences: MediaAssetReference[];
  mediaResolver: MediaResolverState;
  schema: PageSchema;
  onViewportChange: (viewport: Viewport) => void;
  viewport: Viewport;
}) {
  const mediaFeedback = readMediaResolverFeedback({
    error: props.mediaResolver.error,
    isLoading: props.mediaResolver.isLoading,
    mediaTypesByReference: props.mediaResolver.mediaTypesByReference,
    references: props.mediaReferences,
    urlsByReference: props.mediaResolver.urlsByReference,
  });
  const canRecheckMedia = mediaFeedback && mediaFeedback.type !== "info";

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
          action={
            canRecheckMedia ? (
              <Button
                disabled={props.mediaResolver.isLoading}
                icon={<ReloadOutlined />}
                onClick={() => {
                  void props.mediaResolver.refresh();
                }}
                size="small"
              >
                Recheck
              </Button>
            ) : undefined
          }
          description={mediaFeedback.description}
          message={mediaFeedback.message}
          showIcon
          style={{ marginBottom: 16 }}
          type={mediaFeedback.type}
        />
      ) : null}
      {mediaFeedback?.type === "warning" ? (
        <Space size={8} style={{ marginBottom: 16 }} wrap>
          {mediaFeedback.missingReferenceCount ? (
            <Typography.Text type="secondary">
              Missing: {mediaFeedback.missingReferenceCount}
            </Typography.Text>
          ) : null}
          {mediaFeedback.unsupportedReferenceCount ? (
            <Typography.Text type="secondary">
              Unsupported type: {mediaFeedback.unsupportedReferenceCount}
            </Typography.Text>
          ) : null}
        </Space>
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
          resolveMediaUrl={props.mediaResolver.resolveMediaUrl}
          schema={props.schema}
          viewport={props.viewport}
        />
      </div>
    </section>
  );
}
