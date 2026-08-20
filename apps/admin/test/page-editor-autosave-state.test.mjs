import assert from "node:assert/strict";
import test from "node:test";
import { exampleLandingPage } from "@app-starter/schema";
import { readPageEditorAutosaveState } from "../src/features/pages/page-editor-autosave-state.ts";
import { createSchemaFingerprint } from "../src/features/pages/schema-fingerprint.ts";

function createInput(overrides = {}) {
  return {
    draftSchema: exampleLandingPage,
    isCreatingPreview: false,
    isLoading: false,
    isPublishing: false,
    isSaving: false,
    rollingBackVersionId: null,
    savedDraftFingerprint: createSchemaFingerprint(exampleLandingPage),
    ...overrides,
  };
}

test("page editor autosave state treats matching fingerprints as clean", () => {
  const state = readPageEditorAutosaveState(createInput());

  assert.equal(state.isDraftDirty, false);
  assert.equal(state.isAutosaveBusy, false);
  assert.equal(
    state.draftFingerprint,
    createSchemaFingerprint(exampleLandingPage),
  );
});

test("page editor autosave state detects changed draft schemas", () => {
  const changedSchema = structuredClone(exampleLandingPage);
  changedSchema.meta.title = "Updated Landing";

  const state = readPageEditorAutosaveState(
    createInput({ draftSchema: changedSchema }),
  );

  assert.equal(state.isDraftDirty, true);
});

test("page editor autosave state stays clean until a saved baseline exists", () => {
  const changedSchema = structuredClone(exampleLandingPage);
  changedSchema.meta.title = "Updated Landing";

  const state = readPageEditorAutosaveState(
    createInput({
      draftSchema: changedSchema,
      savedDraftFingerprint: null,
    }),
  );

  assert.equal(state.isDraftDirty, false);
});

test("page editor autosave state pauses while editor actions are busy", () => {
  for (const override of [
    { isCreatingPreview: true },
    { isLoading: true },
    { isPublishing: true },
    { isSaving: true },
    { rollingBackVersionId: "version-1" },
  ]) {
    const state = readPageEditorAutosaveState(createInput(override));

    assert.equal(state.isAutosaveBusy, true);
  }
});
