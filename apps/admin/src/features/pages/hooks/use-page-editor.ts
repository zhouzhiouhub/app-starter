import { useCallback, useEffect, useState } from "react";
import { createFallbackPage, type PageSchema, type Viewport } from "@app-starter/schema";
import { AuthRequiredError } from "../../auth/api";
import { formatRequestError } from "../../../lib/api-error";
import { getPage, publishPage, savePageDraft } from "../api";
import type { EditorFeedback, PageSummary } from "../types";

export function usePageEditor(pageId: string | undefined) {
  const [page, setPage] = useState<PageSummary | null>(null);
  const [draftSchema, setDraftSchema] = useState<PageSchema | null>(null);
  const [viewport, setViewport] = useState<Viewport>("desktop");
  const [feedback, setFeedback] = useState<EditorFeedback | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      setDraftSchema(
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
  }, [pageId]);

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
      setDraftSchema(published);
      setPage((current) =>
        current
          ? {
              ...current,
              status: "published",
              title: published.meta.title,
            }
          : current,
      );
      setFeedback({
        message:
          "Published. Refresh the storefront page to load the latest published content.",
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
  }, [draftSchema, pageId]);

  return {
    draftSchema,
    error,
    feedback,
    isLoading,
    isPublishing,
    isSaving,
    page,
    publish,
    saveDraft,
    setDraftSchema,
    setFeedback,
    setViewport,
    viewport,
  };
}
