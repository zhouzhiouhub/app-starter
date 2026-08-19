import assert from "node:assert/strict";
import test from "node:test";
import { hasUnsafeAuditMetadata, isPageAuditLog } from "./audit-smoke.mjs";
import {
  formatRollbackRevalidationFailure,
  isRollbackResponse,
  readPublishedVersionIdFromDetail,
} from "./rollback-smoke.mjs";

test("smoke helpers validate safe page audit logs", () => {
  assert.equal(
    isPageAuditLog(
      {
        action: "page.published",
        metadata: {
          publishedVersionId: "version-1",
          slug: "smoke-page",
        },
        targetId: "page-1",
        targetType: "page",
      },
      {
        action: "page.published",
        pageId: "page-1",
        slug: "smoke-page",
      },
    ),
    true,
  );
  assert.equal(
    isPageAuditLog(
      {
        action: "preview_token.created",
        metadata: {
          slug: "smoke-page",
          token: "[redacted]",
        },
        targetId: "page-1",
        targetType: "page",
      },
      {
        action: "preview_token.created",
        pageId: "page-1",
        slug: "smoke-page",
      },
    ),
    false,
  );
  assert.equal(
    hasUnsafeAuditMetadata({
      nested: {
        previewSecret: "[redacted]",
      },
    }),
    true,
  );
  assert.equal(
    isPageAuditLog(
      {
        action: "page.rolled_back",
        metadata: {
          rollbackVersionId: "version-3",
          slug: "smoke-page",
          targetVersionId: "version-1",
        },
        targetId: "page-1",
        targetType: "page",
      },
      {
        action: "page.rolled_back",
        pageId: "page-1",
        slug: "smoke-page",
      },
    ),
    true,
  );
});

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
