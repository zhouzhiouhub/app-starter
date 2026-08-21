import assert from "node:assert/strict";
import test from "node:test";
import {
  assertPreviewFlow,
  formatWebPreviewAttempt,
  getPreviewPath,
  isPreviewTokenShape,
  readWebPreviewAttempt,
} from "./preview-smoke.mjs";
import { withFetch } from "./smoke-test-runtime.mjs";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

test("preview smoke flow sends idempotency keys for write requests", async () => {
  const calls = [];
  const title = "Draft preview title";

  await withFetch(async (url, init = {}) => {
    calls.push({
      headers: init.headers ?? {},
      method: init.method ?? "GET",
      url,
    });

    if (url === "https://api.example.com/pages?limit=100") {
      return jsonResponse({
        data: [
          {
            id: "page-1",
            slug: "smoke-page",
          },
        ],
      });
    }

    if (url === "https://api.example.com/pages/page-1/schema") {
      return jsonResponse({
        data: {
          title,
        },
      });
    }

    if (url === "https://api.example.com/pages/page-1/preview-token") {
      return jsonResponse({
        data: {
          expiresAt: "2026-08-21T00:15:00.000Z",
          slug: "smoke-page",
          token: "payload.signature",
        },
      });
    }

    if (url === "https://api.example.com/public/preview/payload.signature") {
      return jsonResponse({
        data: {
          meta: {
            title,
          },
        },
        meta: {
          preview: true,
        },
      });
    }

    if (url === "https://web.example.com/preview?token=payload.signature") {
      return new Response(
        `<html><head><meta name="robots" content="noindex" /></head><body>${title}</body></html>`,
        {
          status: 200,
          statusText: "OK",
        },
      );
    }

    throw new Error(`Unexpected fetch URL: ${url}`);
  }, async () => {
    await assertPreviewFlow(
      {
        apiBaseUrl: "https://api.example.com",
        retryAttempts: 1,
        retryDelayMs: 1,
        slug: "smoke-page",
        webUrl: "https://web.example.com",
      },
      "access-token",
      { meta: { title } },
      title,
    );
  });

  const [, draftSave, previewToken] = calls;

  assert.equal(draftSave.method, "PUT");
  assert.match(draftSave.headers["Idempotency-Key"], uuidPattern);
  assert.equal(previewToken.method, "POST");
  assert.match(previewToken.headers["Idempotency-Key"], uuidPattern);
  assert.notEqual(
    draftSave.headers["Idempotency-Key"],
    previewToken.headers["Idempotency-Key"],
  );
  assert.deepEqual(
    calls.map((call) => call.method),
    ["GET", "PUT", "POST", "GET", "GET"],
  );
});

function jsonResponse(body) {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    status: 200,
    statusText: "OK",
  });
}
