import { useCallback, type Dispatch, type SetStateAction } from "react";
import type { PageSchema } from "@app-starter/schema";
import { redirectWhenAuthRequired } from "../../auth/auth-redirect";
import {
  createPreviewToken,
  getPage,
  publishPage,
  rollbackPage,
  savePageDraft,
} from "../api";
import { readEditorErrorFeedback } from "../editor-feedback";
import { readMediaPublishPreflightIssue } from "../media-publish-preflight";
import type { MediaResolverFeedback } from "../../media/media-resolver-feedback";
import type { PageEditorSavedState } from "../page-editor-detail-state";
import { readPageEditorSavedState } from "../page-editor-detail-state";
import {
  collectPublishPreflightIssues,
  findBlockingPublishPreflightIssueFromIssues,
  formatPublishPreflightWarningSummary,
} from "../publish-preflight";
import { buildPublicationFeedback } from "../revalidation-feedback";
import { openStorefrontPreviewWindow } from "../preview-window";
import { getStorefrontPreviewUrl } from "../storefront-url";
import type { EditorFeedback } from "../types";

interface SaveDraftOptions {
  silent?: boolean;
}

interface UsePageEditorActionsInput {
  applySavedState: (state: PageEditorSavedState) => void;
  draftSchema: PageSchema | null;
  mediaFeedback: MediaResolverFeedback | null;
  pageId: string | undefined;
  resetSchema: (schema: PageSchema) => void;
  setFeedback: Dispatch<SetStateAction<EditorFeedback | null>>;
  setIsCreatingPreview: Dispatch<SetStateAction<boolean>>;
  setIsPublishing: Dispatch<SetStateAction<boolean>>;
  setIsSaving: Dispatch<SetStateAction<boolean>>;
  setRollingBackVersionId: Dispatch<SetStateAction<string | null>>;
  siteDomain?: string | null;
}

export function usePageEditorActions(input: UsePageEditorActionsInput) {
  const saveDraft = useCallback(
    async (options: SaveDraftOptions = {}) => {
      if (!input.pageId || !input.draftSchema) {
        return;
      }

      input.setIsSaving(true);

      if (!options.silent) {
        input.setFeedback(null);
      }

      try {
        await savePageDraft(input.pageId, input.draftSchema);
        input.applySavedState(
          readPageEditorSavedState(
            await getPage(input.pageId),
            input.draftSchema,
          ),
        );

        if (!options.silent) {
          input.setFeedback({
            message:
              "Draft saved. Publish when you want the storefront to update.",
            type: "success",
          });
        }
      } catch (caught) {
        if (redirectWhenAuthRequired(caught)) {
          return;
        }

        input.setFeedback(readEditorErrorFeedback(caught));
      } finally {
        input.setIsSaving(false);
      }
    },
    [input],
  );

  const publish = useCallback(async () => {
    if (!input.pageId || !input.draftSchema) {
      return;
    }

    const preflightIssues = collectPublishPreflightIssues(input.draftSchema);
    const blockingIssue =
      findBlockingPublishPreflightIssueFromIssues(preflightIssues);

    if (blockingIssue) {
      input.setFeedback({
        message: `Cannot publish yet. ${blockingIssue.message}`,
        type: "error",
      });
      return;
    }

    const mediaIssue = readMediaPublishPreflightIssue(input.mediaFeedback);

    if (mediaIssue) {
      input.setFeedback({
        message: `Cannot publish yet. ${mediaIssue.message}`,
        type: "error",
      });
      return;
    }

    const preflightWarningSummary =
      formatPublishPreflightWarningSummary(preflightIssues);

    input.setIsPublishing(true);
    input.setFeedback(null);

    try {
      const published = await publishPage(input.pageId, input.draftSchema);
      input.resetSchema(published.schema);
      input.applySavedState(
        readPageEditorSavedState(await getPage(input.pageId), published.schema),
      );
      input.setFeedback(
        buildPublicationFeedback({
          action: "publish",
          locale: published.schema.meta.locale,
          revalidation: published.meta?.revalidation,
          preflightWarningSummary,
          siteDomain: input.siteDomain,
          slug: published.schema.meta.slug,
        }),
      );
    } catch (caught) {
      if (redirectWhenAuthRequired(caught)) {
        return;
      }

      input.setFeedback(readEditorErrorFeedback(caught));
    } finally {
      input.setIsPublishing(false);
    }
  }, [input]);

  const openPreview = useCallback(async () => {
    if (!input.pageId || !input.draftSchema) {
      return;
    }

    input.setIsCreatingPreview(true);
    input.setFeedback(null);

    try {
      await savePageDraft(input.pageId, input.draftSchema);
      input.applySavedState(
        readPageEditorSavedState(
          await getPage(input.pageId),
          input.draftSchema,
        ),
      );
      const preview = await createPreviewToken(input.pageId);
      openStorefrontPreviewWindow(
        getStorefrontPreviewUrl(preview.token, input.siteDomain),
      );
      input.setFeedback({
        message: `Preview opened. This link expires at ${preview.expiresAt}.`,
        type: "success",
      });
    } catch (caught) {
      if (redirectWhenAuthRequired(caught)) {
        return;
      }

      input.setFeedback(readEditorErrorFeedback(caught));
    } finally {
      input.setIsCreatingPreview(false);
    }
  }, [input]);

  const rollbackToVersion = useCallback(
    async (versionId: string) => {
      if (!input.pageId) {
        return;
      }

      input.setRollingBackVersionId(versionId);
      input.setFeedback(null);

      try {
        const rolledBack = await rollbackPage(input.pageId, versionId);
        input.resetSchema(rolledBack.schema);
        input.applySavedState(
          readPageEditorSavedState(
            await getPage(input.pageId),
            rolledBack.schema,
          ),
        );
        input.setFeedback(
          buildPublicationFeedback({
            action: "rollback",
            locale: rolledBack.schema.meta.locale,
            revalidation: rolledBack.meta?.revalidation,
            siteDomain: input.siteDomain,
            slug: rolledBack.schema.meta.slug,
          }),
        );
      } catch (caught) {
        if (redirectWhenAuthRequired(caught)) {
          return;
        }

        input.setFeedback(readEditorErrorFeedback(caught));
      } finally {
        input.setRollingBackVersionId(null);
      }
    },
    [input],
  );

  return {
    openPreview,
    publish,
    rollbackToVersion,
    saveDraft,
  };
}
