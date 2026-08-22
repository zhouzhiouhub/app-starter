import assert from "node:assert/strict";
import test from "node:test";
import {
  formatPageAuditLogDiagnostic,
  hasUnsafeAuditMetadata,
  isPageAuditLog,
  readPageAuditLogDiagnostic,
} from "./audit-smoke.mjs";

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
    hasUnsafeAuditMetadata({
      nested: {
        previewToken: "[redacted]",
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

test("smoke helpers summarize missing audit log diagnostics", () => {
  const diagnostic = readPageAuditLogDiagnostic(
    [
      {
        action: "page.published",
        metadata: {
          slug: "smoke-page",
        },
        targetId: "other-page",
        targetType: "page",
      },
      {
        action: "preview_token.created",
        metadata: {
          slug: "smoke-page",
          token: "secret-token-value",
        },
        targetId: "page-1",
        targetType: "page",
      },
      {
        action: "page.published",
        metadata: {
          slug: "smoke-page",
        },
        targetId: "page-1",
        targetType: "site",
      },
    ],
    {
      action: "page.published",
      pageId: "page-1",
      slug: "smoke-page",
    },
  );

  assert.deepEqual(diagnostic, {
    actionMatches: 2,
    dataType: "array",
    itemCount: 3,
    slugMatches: 3,
    targetIdMatches: 2,
    targetTypeMatches: 2,
    unsafeMetadataCount: 1,
    validMatches: 0,
  });
  assert.equal(
    formatPageAuditLogDiagnostic(diagnostic),
    "data: array, items: 3, action matches: 2, target id matches: 2, target type matches: 2, slug matches: 3, unsafe metadata: 1, valid matches: 0",
  );
  assert.equal(
    formatPageAuditLogDiagnostic(diagnostic).includes("secret-token-value"),
    false,
  );
});

test("smoke helpers diagnose malformed audit log payloads", () => {
  assert.deepEqual(
    readPageAuditLogDiagnostic(
      {
        data: [],
      },
      {
        action: "page.published",
        pageId: "page-1",
        slug: "smoke-page",
      },
    ),
    {
      actionMatches: 0,
      dataType: "object",
      itemCount: 0,
      slugMatches: 0,
      targetIdMatches: 0,
      targetTypeMatches: 0,
      unsafeMetadataCount: 0,
      validMatches: 0,
    },
  );
});
