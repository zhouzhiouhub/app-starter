import { Alert, Tag, Typography } from "antd";
import type { PageSchema, Viewport } from "@app-starter/schema";
import { getStorefrontPagePath } from "../storefront-url";
import type { EditorFeedback, PageSummary } from "../types";
import { ChromeSettingsPanel } from "./chrome-settings-panel";
import { PageContentFields } from "./page-content-fields";
import { PageEditorToolbar } from "./page-editor-toolbar";
import { PagePreviewPane } from "./page-preview-pane";
import { PageSectionList } from "./page-section-list";

export function PageEditor(props: {
  feedback: EditorFeedback | null;
  isPublishing: boolean;
  isSaving: boolean;
  onFeedbackClose: () => void;
  onPublish: () => void;
  onSaveDraft: () => void;
  onSchemaChange: (schema: PageSchema) => void;
  onViewportChange: (viewport: Viewport) => void;
  page: PageSummary;
  schema: PageSchema;
  viewport: Viewport;
}) {
  return (
    <div>
      <div
        style={{
          alignItems: "flex-start",
          display: "flex",
          gap: 16,
          justifyContent: "space-between",
        }}
      >
        <div>
          <Typography.Title level={3}>{props.page.title}</Typography.Title>
          <Typography.Paragraph>
            Storefront URL:{" "}
            <Typography.Text code>
              {getStorefrontPagePath(props.page.slug)}
            </Typography.Text>
            . Home stays at <Typography.Text code>/en</Typography.Text>. Edit
            the page body below, then publish and open View on site.
          </Typography.Paragraph>
        </div>
        <PageEditorToolbar
          isPublishing={props.isPublishing}
          isSaving={props.isSaving}
          onPublish={props.onPublish}
          onSaveDraft={props.onSaveDraft}
          published={props.page.status === "published"}
          slug={props.page.slug}
        />
      </div>
      {props.feedback ? (
        <Alert
          closable
          message={props.feedback.message}
          onClose={props.onFeedbackClose}
          showIcon
          style={{ marginBottom: 16 }}
          type={props.feedback.type}
        />
      ) : null}
      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        <Tag color={props.page.status === "published" ? "green" : "default"}>
          {props.page.status}
        </Tag>
        <Tag color="blue">DEFAULT_LOCALE=en-US</Tag>
        <Tag color="default">COMMERCE_ENABLED=false</Tag>
        <Tag color="default">MULTI_LOCALE_ENABLED=false</Tag>
      </div>
      <div
        style={{
          display: "grid",
          gap: 24,
          gridTemplateColumns: "minmax(320px, 420px) minmax(0, 1fr)",
        }}
      >
        <div>
          <PageSectionList
            onChange={props.onSchemaChange}
            schema={props.schema}
          />
          <PageContentFields
            onChange={props.onSchemaChange}
            schema={props.schema}
          />
          <ChromeSettingsPanel
            onChange={props.onSchemaChange}
            schema={props.schema}
          />
        </div>
        <PagePreviewPane
          onViewportChange={props.onViewportChange}
          schema={props.schema}
          viewport={props.viewport}
        />
      </div>
    </div>
  );
}
