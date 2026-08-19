import assert from "node:assert/strict";
import test from "node:test";
import { exampleLandingPage } from "@app-starter/schema";
import {
  readPageEditorDraftState,
  readPageEditorSavedState,
} from "../src/features/pages/page-editor-detail-state.ts";
import { createSchemaFingerprint } from "../src/features/pages/schema-fingerprint.ts";

function createDetail(overrides = {}) {
  return {
    createdAt: "2026-08-19T00:00:00.000Z",
    draftSchema: null,
    id: "page-1",
    publishedSchema: null,
    publishedVersionId: null,
    siteId: "site-1",
    slug: "landing",
    status: "draft",
    title: "Landing",
    type: "landing",
    updatedAt: "2026-08-19T00:00:00.000Z",
    versions: [],
    ...overrides,
  };
}

test("page editor draft state creates a fallback schema when no draft exists", () => {
  const state = readPageEditorDraftState(createDetail());

  assert.equal(state.page.slug, "landing");
  assert.equal(state.schema.meta.slug, "landing");
  assert.equal(state.schema.meta.title, "Landing");
  assert.equal(
    state.savedDraftFingerprint,
    createSchemaFingerprint(state.schema),
  );
});

test("page editor state keeps existing draft schemas and version summaries", () => {
  const detail = createDetail({
    draftSchema: exampleLandingPage,
    versions: [
      {
        authorEmail: "admin@example.com",
        authorId: "user-1",
        authorName: "Admin",
        createdAt: "2026-08-19T00:00:00.000Z",
        id: "version-1",
        publishedAt: null,
        status: "draft",
        version: 1,
      },
    ],
  });
  const draft = readPageEditorDraftState(detail);
  const saved = readPageEditorSavedState(detail, exampleLandingPage);

  assert.equal(draft.schema, exampleLandingPage);
  assert.equal(saved.versions.length, 1);
  assert.equal(
    saved.savedDraftFingerprint,
    createSchemaFingerprint(exampleLandingPage),
  );
});
