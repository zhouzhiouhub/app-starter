import { useCallback, useEffect, useMemo, useState } from "react";
import { createFallbackPage, type Viewport } from "@app-starter/schema";
import { AuthRequiredError } from "../../auth/api";
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
import type {
  EditorFeedback,
  PageSummary,
  PageVersionSummary,
} from "../types";
import { usePageEditorAutosave } from "./use-page-editor-autosave";
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
      const schema =
        detail.draftSchema ??
        createFallbackPage({
          slug: detail.slug,
          title: detail.title,
        });

      setPage(detail);
      setVersions(detail.versions);
      resetSchema(schema);
      setSavedDraftFingerprint(createSchemaFingerprint(schema));
    } catch (caught) {
      if (caught instanceof AuthRequiredError) {
        globalThis.location.assign("/login");
        return;
      }

      setError(formatRequestError(caught));
    } finally {
      setIsLoading(false);
    }
  }, [pageId, resetSchema]);

  useEffect(() => {
    void load();
  }, [load]);

  const saveDraft = useCallback(async (options: SaveDraftOptions = {}) => {
    if (!pageId || !draftSchema) {
      return;
    }

    setIsSaving(true);

    if (!options.silent) {
      setFeedback(null);
    }

    try {
      const summary = await savePageDraft(pageId, draftSchema);
      setPage(summary);
      const detail = await getPage(pageId);
      setPage(detail);
      setVersions(detail.versions);
      setSavedDraftFingerprint(createSchemaFingerprint(draftSchema));

      if (!options.silent) {
        setFeedback({
          message:
            "Draft saved. Publish when you want the storefront to update.",
          type: "success",
        });
      }
    } catch (caught) {
      if (caught instanceof AuthRequiredError) {
        globalThis.location.assign("/login");
        return;
      }

      setFeedback({
        message: formatRequestError(caught),
        type: "error",
      });
    } finally {
      setIsSaving(false);
    }
  }, [draftSchema, pageId]);

  const publish = useCallback(async () => {
    if (!pageId || !draftSchema) {
      return;
    }

    setIsPublishing(true);
    setFeedback(null);

    try {
      const published = await publishPage(pageId, draftSchema);
      resetSchema(published.schema);
      setSavedDraftFingerprint(createSchemaFingerprint(published.schema));
      const detail = await getPage(pageId);
      setPage(detail);
      setVersions(detail.versions);
      setFeedback({
        message: buildPublicationFeedback({
          action: "publish",
          revalidation: published.meta?.revalidation,
          slug: published.schema.meta.slug,
        }),
        type: "success",
      });
    } catch (caught) {
      if (caught instanceof AuthRequiredError) {
        globalThis.location.assign("/login");
        return;
      }

      setFeedback({
        message: formatRequestError(caught),
        type: "error",
      });
    } finally {
      setIsPublishing(false);
    }
  }, [draftSchema, pageId, resetSchema]);

  const openPreview = useCallback(async () => {
    if (!pageId || !draftSchema) {
      return;
    }

    setIsCreatingPreview(true);
    setFeedback(null);

    try {
      const summary = await savePageDraft(pageId, draftSchema);
      setPage(summary);
      const detail = await getPage(pageId);
      setPage(detail);
      setVersions(detail.versions);
      setSavedDraftFingerprint(createSchemaFingerprint(draftSchema));
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
      if (caught instanceof AuthRequiredError) {
        globalThis.location.assign("/login");
        return;
      }

      setFeedback({
        message: formatRequestError(caught),
        type: "error",
      });
    } finally {
      setIsCreatingPreview(false);
    }
  }, [draftSchema, pageId]);

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
        setSavedDraftFingerprint(createSchemaFingerprint(rolledBack.schema));
        const detail = await getPage(pageId);
        setPage(detail);
        setVersions(detail.versions);
        setFeedback({
          message: buildPublicationFeedback({
            action: "rollback",
            revalidation: rolledBack.meta?.revalidation,
            slug: rolledBack.schema.meta.slug,
          }),
          type: "success",
        });
      } catch (caught) {
        if (caught instanceof AuthRequiredError) {
          globalThis.location.assign("/login");
          return;
        }

        setFeedback({
          message: formatRequestError(caught),
          type: "error",
        });
      } finally {
        setRollingBackVersionId(null);
      }
    },
    [pageId, resetSchema],
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
