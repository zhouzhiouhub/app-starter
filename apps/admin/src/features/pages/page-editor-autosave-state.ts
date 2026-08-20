import type { PageSchema } from "@app-starter/schema";
import { createSchemaFingerprint } from "./schema-fingerprint.ts";

export interface PageEditorAutosaveStateInput {
  draftSchema: PageSchema | null;
  isCreatingPreview: boolean;
  isLoading: boolean;
  isPublishing: boolean;
  isSaving: boolean;
  rollingBackVersionId: string | null;
  savedDraftFingerprint: string | null;
}

export interface PageEditorAutosaveState {
  draftFingerprint: string | null;
  isAutosaveBusy: boolean;
  isDraftDirty: boolean;
}

export function readPageEditorAutosaveState(
  input: PageEditorAutosaveStateInput,
): PageEditorAutosaveState {
  const draftFingerprint = createSchemaFingerprint(input.draftSchema);

  return {
    draftFingerprint,
    isAutosaveBusy: readPageEditorAutosaveBusy(input),
    isDraftDirty: readPageEditorDraftDirty(
      draftFingerprint,
      input.savedDraftFingerprint,
    ),
  };
}

function readPageEditorAutosaveBusy(
  input: PageEditorAutosaveStateInput,
): boolean {
  return (
    input.isCreatingPreview ||
    input.isLoading ||
    input.isPublishing ||
    input.isSaving ||
    Boolean(input.rollingBackVersionId)
  );
}

function readPageEditorDraftDirty(
  draftFingerprint: string | null,
  savedDraftFingerprint: string | null,
): boolean {
  return (
    Boolean(draftFingerprint) &&
    Boolean(savedDraftFingerprint) &&
    draftFingerprint !== savedDraftFingerprint
  );
}
