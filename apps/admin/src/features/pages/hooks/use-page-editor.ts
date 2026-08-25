import { useCallback, useEffect, useMemo, useState } from "react";
import type { Viewport } from "@app-starter/schema";
import { redirectWhenAuthRequired } from "../../auth/auth-redirect";
import { formatRequestError } from "../../../lib/api-error";
import { getPage } from "../api";
import { readPageEditorDraftState } from "../page-editor-detail-state";
import type { EditorFeedback } from "../types";
import { usePageEditorActions } from "./use-page-editor-actions";
import { usePageEditorAutosave } from "./use-page-editor-autosave";
import { usePageEditorAutosaveState } from "./use-page-editor-autosave-state";
import { usePageMediaPreflight } from "./use-page-media-preflight";
import { usePageEditorSavedState } from "./use-page-editor-saved-state";
import { usePageVersionList } from "./use-page-version-list";
import { useSchemaHistory } from "./use-schema-history";

export function usePageEditor(pageId: string | undefined) {
  const [viewport, setViewport] = useState<Viewport>("desktop");
  const [feedback, setFeedback] = useState<EditorFeedback | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingPreview, setIsCreatingPreview] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [rollingBackVersionId, setRollingBackVersionId] = useState<
    string | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const {
    canRedo,
    canUndo,
    commitSchema,
    redo,
    resetSchema,
    schema: draftSchema,
    undo,
  } = useSchemaHistory();
  const {
    applyDraftState,
    applySavedState,
    page,
    savedDraftFingerprint,
  } = usePageEditorSavedState({ resetSchema });
  const versionHistory = usePageVersionList(pageId);
  const { mediaFeedback, mediaReferences, mediaResolver } =
    usePageMediaPreflight(draftSchema);

  const load = useCallback(async () => {
    if (!pageId) {
      setError("Page id is missing.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const detail = await getPage(pageId);
      applyDraftState(readPageEditorDraftState(detail));
    } catch (caught) {
      if (redirectWhenAuthRequired(caught)) {
        return;
      }

      setError(formatRequestError(caught));
    } finally {
      setIsLoading(false);
    }
  }, [applyDraftState, pageId]);

  useEffect(() => {
    void load();
  }, [load]);

  const actionInput = useMemo(
    () => ({
      applySavedState,
      draftSchema,
      mediaFeedback,
      mediaReferences,
      pageId,
      resetSchema,
      refreshVersionHistory: versionHistory.refreshFirstPage,
      setFeedback,
      setIsCreatingPreview,
      setIsPublishing,
      setIsSaving,
      setRollingBackVersionId,
      siteDomain: page?.siteDomain,
    }),
    [
      applySavedState,
      draftSchema,
      mediaFeedback,
      mediaReferences,
      page?.siteDomain,
      pageId,
      resetSchema,
      versionHistory.refreshFirstPage,
    ],
  );
  const { openPreview, publish, rollbackToVersion, saveDraft } =
    usePageEditorActions(actionInput);

  const autosaveState = usePageEditorAutosaveState({
    draftSchema,
    isCreatingPreview,
    isLoading,
    isPublishing,
    isSaving,
    rollingBackVersionId,
    savedDraftFingerprint,
  });
  const saveDraftSilently = useCallback(
    () => saveDraft({ silent: true }),
    [saveDraft],
  );

  usePageEditorAutosave({
    enabled: autosaveState.isDraftDirty,
    isBusy: autosaveState.isAutosaveBusy,
    onSaveDraft: saveDraftSilently,
  });

  return {
    canRedo,
    canUndo,
    draftSchema,
    error,
    feedback,
    isCreatingPreview,
    isDraftDirty: autosaveState.isDraftDirty,
    isLoading,
    isPublishing,
    isSaving,
    isVersionHistoryLoading: versionHistory.isLoading,
    mediaFeedback,
    mediaReferences,
    mediaResolver,
    page,
    openPreview,
    publish,
    redo,
    rollbackToVersion,
    rollingBackVersionId,
    saveDraft,
    setDraftSchema: commitSchema,
    setFeedback,
    setViewport,
    undo,
    versionHistoryError: versionHistory.error,
    versionHistoryMeta: versionHistory.meta,
    versions: versionHistory.versions,
    onVersionHistoryPageChange: versionHistory.loadPage,
    viewport,
  };
}
