import { useCallback, useState } from "react";
import type { PageSchema } from "@app-starter/schema";
import type {
  PageEditorDraftState,
  PageEditorSavedState,
} from "../page-editor-detail-state";
import type { PageSummary, PageVersionSummary } from "../types";

interface UsePageEditorSavedStateInput {
  resetSchema: (schema: PageSchema) => void;
}

export function usePageEditorSavedState({
  resetSchema,
}: UsePageEditorSavedStateInput) {
  const [page, setPage] = useState<PageSummary | null>(null);
  const [versions, setVersions] = useState<PageVersionSummary[]>([]);
  const [savedDraftFingerprint, setSavedDraftFingerprint] = useState<
    string | null
  >(null);

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

  return {
    applyDraftState,
    applySavedState,
    page,
    savedDraftFingerprint,
    versions,
  };
}
