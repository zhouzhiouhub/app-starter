import { useCallback, useEffect, useMemo, useState } from "react";
import type { Viewport } from "@app-starter/schema";
import { redirectWhenAuthRequired } from "../../auth/auth-redirect";
import { formatRequestError } from "../../../lib/api-error";
import {
  createPreviewToken,
  getPage,
  publishPage,
  rollbackPage,
  savePageDraft,
} from "../api";
import { getStorefrontPreviewUrl } from "../storefront-url";
import { createSchemaFingerprint } from "../schema-fingerprint";
import { buildPublicationFeedback } from "../revalidation-feedback";
import { findBlockingPublishPreflightIssue } from "../publish-preflight";
import { readMediaPublishPreflightIssue } from "../media-publish-preflight";
import { readEditorErrorFeedback } from "../editor-feedback";
import {
  readPageEditorDraftState,
  readPageEditorSavedState,
  type PageEditorDraftState,
  type PageEditorSavedState,
} from "../page-editor-detail-state";
import type { EditorFeedback, PageSummary, PageVersionSummary } from "../types";
import { usePageEditorAutosave } from "./use-page-editor-autosave";
import { usePageMediaPreflight } from "./use-page-media-preflight";
import { useSchemaHistory } from "./use-schema-history";

interface SaveDraftOptions {
  silent?: boolean;
}

export function usePageEditor(pageId: string | undefined) {
  const [page, setPage] = useState<PageSummary | null>(null);
  const [versions, setVersions] = useState<PageVersionSummary[]>([]);
  const [viewport, setViewport] = useState<Viewport>("desktop");
  const [savedDraftFingerprint, setSavedDraftFingerprint] = useState<
    string | null
  >(null);
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
  const { mediaFeedback, mediaReferences, mediaResolver } =
    usePageMediaPreflight(draftSchema);

  const applySavedState = useCallback((state: PageEditorSavedState) => {
    setPage(state.page);
    setVersions(state.versions);
    setSavedDraftFingerprint(state.savedDraftFingerprint);
  }, []);

  const applyDraftState = useCallback(
    (state: PageEditorDraftState) => {
      applySavedState(state);
      resetSchema(state.schema);
    },
    [applySavedState, resetSchema],
  );

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

  const saveDraft = useCallback(
    async (options: SaveDraftOptions = {}) => {
      if (!pageId || !draftSchema) {
        return;
      }

      setIsSaving(true);

      if (!options.silent) {
        setFeedback(null);
      }

      try {
        await savePageDraft(pageId, draftSchema);
        applySavedState(
          readPageEditorSavedState(await getPage(pageId), draftSchema),
        );

        if (!options.silent) {
          setFeedback({
            message:
              "Draft saved. Publish when you want the storefront to update.",
            type: "success",
          });
        }
      } catch (caught) {
        if (redirectWhenAuthRequired(caught)) {
          return;
        }

        setFeedback(readEditorErrorFeedback(caught));
      } finally {
        setIsSaving(false);
      }
    },
    [applySavedState, draftSchema, pageId],
  );

  const publish = useCallback(async () => {
    if (!pageId || !draftSchema) {
      return;
    }

    const blockingIssue = findBlockingPublishPreflightIssue(draftSchema);

    if (blockingIssue) {
      setFeedback({
        message: `Cannot publish yet. ${blockingIssue.message}`,
        type: "error",
      });
      return;
    }

    const mediaIssue = readMediaPublishPreflightIssue(mediaFeedback);

    if (mediaIssue) {
      setFeedback({
        message: `Cannot publish yet. ${mediaIssue.message}`,
        type: "error",
      });
      return;
    }

    setIsPublishing(true);
    setFeedback(null);

    try {
      const published = await publishPage(pageId, draftSchema);
      resetSchema(published.schema);
      applySavedState(
        readPageEditorSavedState(await getPage(pageId), published.schema),
      );
      setFeedback({
        message: buildPublicationFeedback({
          action: "publish",
          revalidation: published.meta?.revalidation,
          slug: published.schema.meta.slug,
        }),
        type: "success",
      });
    } catch (caught) {
      if (redirectWhenAuthRequired(caught)) {
        return;
      }

      setFeedback(readEditorErrorFeedback(caught));
    } finally {
      setIsPublishing(false);
    }
  }, [applySavedState, draftSchema, mediaFeedback, pageId, resetSchema]);

  const openPreview = useCallback(async () => {
    if (!pageId || !draftSchema) {
      return;
    }

    setIsCreatingPreview(true);
    setFeedback(null);

    try {
      await savePageDraft(pageId, draftSchema);
      applySavedState(
        readPageEditorSavedState(await getPage(pageId), draftSchema),
      );
      const preview = await createPreviewToken(pageId);
      globalThis.open(
        getStorefrontPreviewUrl(preview.token),
        "_blank",
        "noreferrer",
      );
      setFeedback({
        message: `Preview opened. This link expires at ${preview.expiresAt}.`,
        type: "success",
      });
    } catch (caught) {
      if (redirectWhenAuthRequired(caught)) {
        return;
      }

      setFeedback(readEditorErrorFeedback(caught));
    } finally {
      setIsCreatingPreview(false);
    }
  }, [applySavedState, draftSchema, pageId]);

  const rollbackToVersion = useCallback(
    async (versionId: string) => {
      if (!pageId) {
        return;
      }

      setRollingBackVersionId(versionId);
      setFeedback(null);

      try {
        const rolledBack = await rollbackPage(pageId, versionId);
        resetSchema(rolledBack.schema);
        applySavedState(
          readPageEditorSavedState(await getPage(pageId), rolledBack.schema),
        );
        setFeedback({
          message: buildPublicationFeedback({
            action: "rollback",
            revalidation: rolledBack.meta?.revalidation,
            slug: rolledBack.schema.meta.slug,
          }),
          type: "success",
        });
      } catch (caught) {
        if (redirectWhenAuthRequired(caught)) {
          return;
        }

        setFeedback(readEditorErrorFeedback(caught));
      } finally {
        setRollingBackVersionId(null);
      }
    },
    [applySavedState, pageId, resetSchema],
  );

  const draftFingerprint = useMemo(
    () => createSchemaFingerprint(draftSchema),
    [draftSchema],
  );
  const isDraftDirty =
    Boolean(draftFingerprint) &&
    Boolean(savedDraftFingerprint) &&
    draftFingerprint !== savedDraftFingerprint;
  const isAutosaveBusy =
    isCreatingPreview ||
    isLoading ||
    isPublishing ||
    isSaving ||
    Boolean(rollingBackVersionId);
  const saveDraftSilently = useCallback(
    () => saveDraft({ silent: true }),
    [saveDraft],
  );

  usePageEditorAutosave({
    enabled: isDraftDirty,
    isBusy: isAutosaveBusy,
    onSaveDraft: saveDraftSilently,
  });

  return {
    canRedo,
    canUndo,
    draftSchema,
    error,
    feedback,
    isCreatingPreview,
    isDraftDirty,
    isLoading,
    isPublishing,
    isSaving,
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
    versions,
    viewport,
  };
}
