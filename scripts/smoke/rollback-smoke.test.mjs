import assert from "node:assert/strict";
import test from "node:test";
import {
  formatRollbackRevalidationFailure,
  isRollbackResponse,
  readPublishedVersionIdFromDetail,
} from "./rollback-smoke.mjs";

test("smoke helpers validate rollback page responses", () => {
  assert.equal(
    readPublishedVersionIdFromDetail({
      data: {
        publishedVersionId: "version-1",
      },
    }),
    "version-1",
  );
  assert.equal(readPublishedVersionIdFromDetail({ data: {} }), null);
  assert.equal(
    isRollbackResponse(
      {
        data: {
          meta: {
            slug: "smoke-page",
            title: "Smoke Page",
          },
        },
      },
      {
        slug: "smoke-page",
      },
      "Smoke Page",
    ),
    true,
  );
  assert.equal(
    isRollbackResponse(
      {
        data: {
          meta: {
            slug: "smoke-page",
            title: "Other",
          },
        },
      },
      {
        slug: "smoke-page",
      },
      "Smoke Page",
    ),
    false,
  );
});

test("smoke helpers explain rollback revalidation failures", () => {
  assert.equal(
    formatRollbackRevalidationFailure(
      {
        paths: ["/en/contact"],
        reason: "request-failed",
        status: 401,
        tags: [],
        triggered: false,
      },
      { requireRevalidation: true },
    ),
    "Rollback revalidation was not triggered (diagnosis: revalidation-secret-mismatch, reason: request-failed, status: 401, paths: 1).",
  );
  assert.equal(
    formatRollbackRevalidationFailure(undefined, {
      requireRevalidation: true,
    }),
    "Rollback revalidation was not triggered (diagnosis: missing-revalidation-meta, reason: unknown, status: none, paths: 0).",
  );
});
