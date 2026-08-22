import { useEffect, useMemo, useState } from "react";
import { Alert, Typography } from "antd";
import {
  getOrderedSectionsForViewport,
  type MediaAssetReference,
  type PageSchema,
  type Viewport,
} from "@app-starter/schema";
import type { MediaResolverFeedback } from "../../media/media-resolver-feedback";
import type { MediaResolverState } from "../../media/hooks/use-media-resolver";
import { readMediaPublishPreflightIssue } from "../media-publish-preflight";
import {
  collectPublishPreflightIssues,
  findBlockingPublishPreflightIssueFromIssues,
} from "../publish-preflight";
import { readPublishPreflightFocusStyle } from "../publish-preflight-focus-style";
import { usePublishPreflightFix } from "../hooks/use-publish-preflight-fix";
import { usePublishPreflightFocus } from "../hooks/use-publish-preflight-focus";
import { getStorefrontPageUrl } from "../storefront-url";
import type { EditorFeedback, PageSummary, PageVersionSummary } from "../types";
import { ChromeSettingsPanel } from "./chrome-settings-panel";
import { PageContentFields } from "./page-content-fields";
import { PageEditorStatusTags } from "./page-editor-status-tags";
import { PageEditorToolbar } from "./page-editor-toolbar";
import { PagePreviewPane } from "./page-preview-pane";
import { PublishPreflightPanel } from "./publish-preflight-panel";
import { PageSectionList } from "./page-section-list";
import { PublicationHistoryPanel } from "./publication-history-panel";
import { SectionLibraryPanel } from "./section-library-panel";
import { SectionPropertiesPanel } from "./section-properties-panel";
import { SeoSettingsPanel } from "./seo-settings-panel";

export function PageEditor(props: {
  canRedo: boolean;
  canUndo: boolean;
  feedback: EditorFeedback | null;
  isCreatingPreview: boolean;
  isDraftDirty: boolean;
  isPublishing: boolean;
  isSaving: boolean;
  mediaFeedback: MediaResolverFeedback | null;
  mediaReferences: MediaAssetReference[];
  mediaResolver: MediaResolverState;
  onFeedbackClose: () => void;
  onOpenPreview: () => void;
  onPublish: () => void;
  onRedo: () => void;
  onRollbackVersion: (versionId: string) => void | Promise<void>;
  onSaveDraft: () => void;
  onSchemaChange: (schema: PageSchema) => void;
  onUndo: () => void;
  onViewportChange: (viewport: Viewport) => void;
  page: PageSummary;
  rollingBackVersionId: string | null;
  schema: PageSchema;
  versions: PageVersionSummary[];
  viewport: Viewport;
}) {
  const [selectedSectionId, setSelectedSectionId] = useState(
    props.schema.sections[0]?.id ?? null,
  );
  const preflightFocus = usePublishPreflightFocus({
    schema: props.schema,
    setSelectedSectionId,
  });
  const preflightFix = usePublishPreflightFix({
    onChange: props.onSchemaChange,
    schema: props.schema,
  });
  const readFocusStyle = (
    area: Parameters<typeof readPublishPreflightFocusStyle>[0],
  ) => readPublishPreflightFocusStyle(area, preflightFocus.highlightedArea);
  const orderedSections = useMemo(
    () => getOrderedSectionsForViewport(props.schema, props.viewport),
    [props.schema, props.viewport],
  );
  const selectedSection = useMemo(
    () =>
      orderedSections.find((section) => section.id === selectedSectionId) ??
      null,
    [orderedSections, selectedSectionId],
  );
  const publishPreflightIssues = useMemo(() => {
    const issues = collectPublishPreflightIssues(props.schema);
    const mediaIssue = readMediaPublishPreflightIssue(props.mediaFeedback);

    return mediaIssue ? [...issues, mediaIssue] : issues;
  }, [props.mediaFeedback, props.schema]);
  const publishDisabled = Boolean(
    findBlockingPublishPreflightIssueFromIssues(publishPreflightIssues),
  );

  useEffect(() => {
    const firstSectionId = orderedSections[0]?.id ?? null;

    if (!selectedSection && selectedSectionId !== firstSectionId) {
      setSelectedSectionId(firstSectionId);
    }
  }, [orderedSections, selectedSection, selectedSectionId]);

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
              {getStorefrontPageUrl(
                props.page.slug,
                "en-US",
                props.page.siteDomain,
              )}
            </Typography.Text>
            . Home stays at <Typography.Text code>/en</Typography.Text>. Edit
            the page body below, then publish and open View on site.
          </Typography.Paragraph>
        </div>
        <PageEditorToolbar
          canRedo={props.canRedo}
          canUndo={props.canUndo}
          isDraftDirty={props.isDraftDirty}
          isCreatingPreview={props.isCreatingPreview}
          isPublishing={props.isPublishing}
          isSaving={props.isSaving}
          onOpenPreview={props.onOpenPreview}
          onPublish={props.onPublish}
          onRedo={props.onRedo}
          onSaveDraft={props.onSaveDraft}
          onUndo={props.onUndo}
          pageId={props.page.id}
          publishDisabled={publishDisabled}
          published={props.page.status === "published"}
          siteDomain={props.page.siteDomain}
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
      <PublishPreflightPanel
        issues={publishPreflightIssues}
        onIssueFix={preflightFix.handleIssueFix}
        onTargetSelect={preflightFocus.handleTargetSelect}
        readIssueFixLabel={preflightFix.readIssueFixLabel}
        readIssueTarget={preflightFocus.readIssueTarget}
      />
      <PageEditorStatusTags
        isDraftDirty={props.isDraftDirty}
        pageStatus={props.page.status}
      />
      <div
        style={{
          display: "grid",
          gap: 24,
          gridTemplateColumns: "minmax(320px, 420px) minmax(0, 1fr)",
        }}
      >
        <div>
          <SectionLibraryPanel
            onChange={props.onSchemaChange}
            onSelect={setSelectedSectionId}
            schema={props.schema}
          />
          <PageSectionList
            onChange={props.onSchemaChange}
            onSelect={setSelectedSectionId}
            selectedSectionId={selectedSectionId}
            schema={props.schema}
            viewport={props.viewport}
          />
          <div
            ref={preflightFocus.sectionPropertiesRef}
            style={readFocusStyle("section")}
          >
            <SectionPropertiesPanel
              highlightedField={preflightFocus.highlightedField}
              onChange={props.onSchemaChange}
              schema={props.schema}
              section={selectedSection}
              viewport={props.viewport}
            />
          </div>
          <div
            ref={preflightFocus.pageContentRef}
            style={readFocusStyle("page")}
          >
            <PageContentFields
              highlightedField={preflightFocus.highlightedField}
              onChange={props.onSchemaChange}
              schema={props.schema}
            />
          </div>
          <div
            ref={preflightFocus.seoSettingsRef}
            style={readFocusStyle("seo")}
          >
            <SeoSettingsPanel
              highlightedField={preflightFocus.highlightedField}
              onChange={props.onSchemaChange}
              schema={props.schema}
            />
          </div>
          <div
            ref={preflightFocus.chromeSettingsRef}
            style={readFocusStyle("chrome")}
          >
            <ChromeSettingsPanel
              highlightedField={preflightFocus.highlightedField}
              onChange={props.onSchemaChange}
              schema={props.schema}
            />
          </div>
          <PublicationHistoryPanel
            onRollbackVersion={props.onRollbackVersion}
            publishedVersionId={props.page.publishedVersionId}
            rollingBackVersionId={props.rollingBackVersionId}
            versions={props.versions}
          />
        </div>
        <div
          ref={preflightFocus.previewRef}
          style={readFocusStyle("media")}
        >
          <PagePreviewPane
            mediaReferences={props.mediaReferences}
            mediaResolver={props.mediaResolver}
            onViewportChange={props.onViewportChange}
            schema={props.schema}
            viewport={props.viewport}
          />
        </div>
      </div>
    </div>
  );
}
