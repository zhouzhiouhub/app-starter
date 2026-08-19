import { Alert, Button, Spin } from "antd";
import { useNavigate, useParams } from "react-router-dom";
import { PageEditor } from "../../features/pages/components/page-editor";
import { usePageEditor } from "../../features/pages/hooks/use-page-editor";

export function PageEditorPage() {
  const { pageId } = useParams<{ pageId: string }>();
  const navigate = useNavigate();
  const editor = usePageEditor(pageId);

  if (editor.isLoading) {
    return (
      <div style={{ padding: 48, textAlign: "center" }}>
        <Spin />
      </div>
    );
  }

  if (editor.error || !editor.page || !editor.draftSchema) {
    return (
      <div>
        <Alert
          message={editor.error ?? "Page could not be loaded."}
          showIcon
          style={{ marginBottom: 16 }}
          type="error"
        />
        <Button onClick={() => navigate("/pages")}>Back to list</Button>
      </div>
    );
  }

  return (
    <PageEditor
      canRedo={editor.canRedo}
      canUndo={editor.canUndo}
      feedback={editor.feedback}
      isCreatingPreview={editor.isCreatingPreview}
      isDraftDirty={editor.isDraftDirty}
      isPublishing={editor.isPublishing}
      isSaving={editor.isSaving}
      onFeedbackClose={() => editor.setFeedback(null)}
      onOpenPreview={() => void editor.openPreview()}
      onPublish={() => void editor.publish()}
      onRedo={editor.redo}
      onRollbackVersion={(versionId) => void editor.rollbackToVersion(versionId)}
      onSaveDraft={() => void editor.saveDraft()}
      onSchemaChange={(schema) => editor.setDraftSchema(schema)}
      onUndo={editor.undo}
      onViewportChange={editor.setViewport}
      page={editor.page}
      rollingBackVersionId={editor.rollingBackVersionId}
      schema={editor.draftSchema}
      versions={editor.versions}
      viewport={editor.viewport}
    />
  );
}
