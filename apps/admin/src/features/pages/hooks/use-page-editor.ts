import { useCallback, useEffect, useState } from "react";
import { createFallbackPage, type Viewport } from "@app-starter/schema";
import { AuthRequiredError } from "../../auth/api";
import { formatRequestError } from "../../../lib/api-error";
import { getPage, publishPage, savePageDraft } from "../api";
import { getStorefrontPageUrl } from "../storefront-url";
import type {
  EditorFeedback,
  PageSummary,
  PageVersionSummary,
} from "../types";
import { useSchemaHistory } from "./use-schema-history";

export function usePageEditor(pageId: string | undefined) {
  const [page, setPage] = useState<PageSummary | null>(null);
  const [versions, setVersions] = useState<PageVersionSummary[]>([]);
  const [viewport, setViewport] = useState<Viewport>("desktop");
  const [feedback, setFeedback] = useState<EditorFeedback | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
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
      setPage(detail);
      setVersions(detail.versions);
      resetSchema(
        detail.draftSchema ??
          createFallbackPage({
            slug: detail.slug,
            title: detail.title,
          }),
      );
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

  const saveDraft = useCallback(async () => {
    if (!pageId || !draftSchema) {
      return;
    }

    setIsSaving(true);
    setFeedback(null);

    try {
      const summary = await savePageDraft(pageId, draftSchema);
      setPage(summary);
      const detail = await getPage(pageId);
      setPage(detail);
      setVersions(detail.versions);
      setFeedback({
        message: "Draft saved. Publish when you want the storefront to update.",
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
      resetSchema(published);
      const detail = await getPage(pageId);
      setPage(detail);
      setVersions(detail.versions);
      setFeedback({
        message: `Published. Open ${getStorefrontPageUrl(published.meta.slug)} to see this page. Home stays at /en.`,
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

  return {
    canRedo,
    canUndo,
    draftSchema,
    error,
    feedback,
    isLoading,
    isPublishing,
    isSaving,
    page,
    publish,
    redo,
    saveDraft,
    setDraftSchema: commitSchema,
    setFeedback,
    setViewport,
    undo,
    versions,
    viewport,
  };
}
