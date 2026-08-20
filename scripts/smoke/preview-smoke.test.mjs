import assert from "node:assert/strict";
import test from "node:test";
import {
  formatWebPreviewAttempt,
  getPreviewPath,
  isPreviewTokenShape,
  readWebPreviewAttempt,
} from "./preview-smoke.mjs";

test("preview smoke helpers build preview paths safely", () => {
  assert.equal(getPreviewPath("abc.def"), "/preview?token=abc.def");
  assert.equal(getPreviewPath("a+b/c"), "/preview?token=a%2Bb%2Fc");
});

test("preview smoke helpers validate preview token responses", () => {
  assert.equal(
    isPreviewTokenShape(
      {
        expiresAt: "2026-08-19T10:00:00.000Z",
        slug: "smoke-page",
        token: "payload.signature",
      },
      "smoke-page",
    ),
    true,
  );
  assert.equal(
    isPreviewTokenShape(
      {
        expiresAt: "not-a-date",
        slug: "smoke-page",
        token: "payload.signature",
      },
      "smoke-page",
    ),
    false,
  );
  assert.equal(
    isPreviewTokenShape(
      {
        expiresAt: "2026-08-19T10:00:00.000Z",
        slug: "other-page",
        token: "payload.signature",
      },
      "smoke-page",
    ),
    false,
  );
});

test("preview smoke helpers summarize web preview attempts", () => {
  const passed = readWebPreviewAttempt(
    {
      ok: true,
      status: 200,
      statusText: "OK",
      text: '<html><head><meta name="robots" content="noindex" /></head><body>Draft title</body></html>',
    },
    "Draft title",
  );
  const failed = readWebPreviewAttempt(
    {
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      text: "<html>\n  <body>Preview crashed while loading draft</body>\n</html>",
    },
    "Draft title",
  );

  assert.deepEqual(passed, {
    bodySnippet: null,
    noIndex: true,
    ok: true,
    status: 200,
    statusText: "OK",
    titlePresent: true,
  });
  assert.equal(
    failed.bodySnippet,
    "<html> <body>Preview crashed while loading draft</body> </html>",
  );
  assert.equal(
    formatWebPreviewAttempt(failed),
    'status 500 Internal Server Error, title present: false, noindex: false, body: "<html> <body>Preview crashed while loading draft</body> </html>"',
  );
});
