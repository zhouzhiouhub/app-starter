import { useMemo } from "react";
import {
  readPageEditorAutosaveState,
  type PageEditorAutosaveStateInput,
} from "../page-editor-autosave-state";

export function usePageEditorAutosaveState(
  input: PageEditorAutosaveStateInput,
) {
  return useMemo(
    () => readPageEditorAutosaveState(input),
    [
      input.draftSchema,
      input.isCreatingPreview,
      input.isLoading,
      input.isPublishing,
      input.isSaving,
      input.rollingBackVersionId,
      input.savedDraftFingerprint,
    ],
  );
}
