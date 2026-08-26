import assert from "node:assert/strict";
import test from "node:test";
import {
  assertAuditLogs,
  formatPageAuditLogDiagnostic,
  hasUnsafeAuditMetadata,
  isPageAuditLog,
  readPageAuditLogDiagnostic,
} from "./audit-smoke.mjs";
import { withFetch } from "./smoke-test-runtime.mjs";

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
    hasUnsafeAuditMetadata({
      nested: {
        detail: "Authorization: Bearer header.payload.signature",
      },
    }),
    true,
  );
  assert.equal(
    hasUnsafeAuditMetadata({
      nested: {
        previewApiUrl:
          "https://api.example.com/api/v1/public/preview/payload.signature",
      },
    }),
    true,
  );
  assert.equal(
    hasUnsafeAuditMetadata({
      nested: {
        publicUrl: "https://store.example.com/page?utm_source=newsletter",
      },
    }),
    false,
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

test("audit smoke requests reject redirects without leaking tokens", async () => {
  const calls = [];

  await withFetch(async (url, init = {}) => {
    calls.push({ init, url });

    return new Response("", {
      headers: {
        Location:
          "https://api.example.com/login?token=header.payload.signature",
      },
      status: 302,
      statusText: "Found",
    });
  }, async () => {
    await assert.rejects(
      () =>
        assertAuditLogs(
          {
            apiBaseUrl: "https://api.example.com/api/v1",
            slug: "smoke-page",
          },
          "access-token",
          "page-1",
          ["page.published"],
        ),
      (error) => {
        assert.equal(calls[0].init.redirect, "manual");
        assert.match(error.message, /audit log request failed\. 302: Found/);
        assert.match(error.message, /redirect:/);
        assert.equal(error.message.includes("header.payload.signature"), false);
        return true;
      },
    );
  });
});

test("audit smoke missing log errors normalize dynamic identifiers", async () => {
  const longPageId = `page-1\nAuthorization Bearer a.b.c ${"x".repeat(400)}`;
  const longAction = `page.published?token=payload.signature${"y".repeat(400)}`;

  await withFetch(async () => jsonResponse({ data: [] }), async () => {
    await assert.rejects(
      () =>
        assertAuditLogs(
          {
            apiBaseUrl: "https://api.example.com/api/v1",
            slug: "smoke-page",
          },
          "access-token",
          longPageId,
          [longAction],
        ),
      (error) => {
        assert.equal(error.message.includes("payload.signature"), false);
        assert.equal(error.message.includes("a.b.c"), false);
        assert.doesNotMatch(error.message, /[\r\n]/);
        assert.match(error.message, /\.\.\./);
        assert.equal(error.message.length <= 420, true);
        return true;
      },
    );
  });
});

test("audit smoke request errors normalize dynamic labels", async () => {
  const longAction = `page.published\nAuthorization Bearer a.b.c?token=payload.signature${"x".repeat(400)}`;

  await withFetch(
    async () =>
      jsonResponse(
        { error: { message: "Forbidden" } },
        { status: 403, statusText: "Forbidden" },
      ),
    async () => {
      await assert.rejects(
        () =>
          assertAuditLogs(
            {
              apiBaseUrl: "https://api.example.com/api/v1",
              slug: "smoke-page",
            },
            "access-token",
            "page-1",
            [longAction],
          ),
        (error) => {
          assert.equal(error.message.includes("payload.signature"), false);
          assert.equal(error.message.includes("a.b.c"), false);
          assert.doesNotMatch(error.message, /[\r\n]/);
          assert.match(error.message, /^page\.published/);
          assert.equal(error.message.length <= 460, true);
          return true;
        },
      );
    },
  );
});

function jsonResponse(body, init = {}) {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    status: init.status ?? 200,
    statusText: init.statusText ?? "OK",
  });
}
