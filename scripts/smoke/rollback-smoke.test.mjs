import assert from "node:assert/strict";
import test from "node:test";
import {
  assertRollbackFlow,
  createRollbackRevalidationFailure,
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
    "Rollback revalidation was not triggered (diagnosis: revalidation-secret-mismatch, reason: request-failed, status: 401, paths: 1, tags: 0).",
  );
  assert.equal(
    formatRollbackRevalidationFailure(undefined, {
      requireRevalidation: true,
    }),
    "Rollback revalidation was not triggered (diagnosis: missing-revalidation-meta, reason: unknown, status: none, paths: 0, tags: 0).",
  );
});

test("smoke helpers keep rollback revalidation diagnostics on failures", () => {
  const error = createRollbackRevalidationFailure(
    {
      paths: ["/en/contact"],
      reason: "request-failed",
      status: 401,
      tags: ["published-page"],
      triggered: false,
    },
    { requireRevalidation: true },
  );

  assert.match(error.message, /revalidation-secret-mismatch/);
  assert.deepEqual(error.smokeDetails, {
    revalidation: {
      diagnosis: "revalidation-secret-mismatch",
      pathCount: 1,
      paths: ["/en/contact"],
      reason: "request-failed",
      required: true,
      status: 401,
      tagCount: 1,
      tags: ["published-page"],
      triggered: false,
    },
  });
});

test("rollback smoke flow returns revalidation diagnostics for reports", async () => {
  const calls = [];

  await withFetch(async (url, init = {}) => {
    calls.push({
      method: init.method ?? "GET",
      redirect: init.redirect,
      url,
    });

    if (url === "https://api.example.com/api/v1/pages/page-1") {
      return jsonResponse({
        data: {
          publishedVersionId: calls.length === 1 ? "version-1" : "version-2",
        },
      });
    }

    if (url === "https://api.example.com/api/v1/pages/page-1/publish") {
      return jsonResponse({
        data: {
          meta: {
            slug: "smoke-page",
            title: "Smoke Page rollback candidate",
          },
        },
      });
    }

    if (url === "https://api.example.com/api/v1/pages/page-1/rollback") {
      return jsonResponse({
        data: {
          meta: {
            slug: "smoke-page",
            title: "Smoke Page",
          },
        },
        meta: {
          revalidation: {
            paths: ["/en/smoke-page"],
            tags: [
              "published-page",
              "published-page:us:en-US",
              "published-page:us:en-US:smoke-page",
              "public-translation",
              "public-translation:en-US",
            ],
            triggered: true,
          },
        },
      });
    }

    throw new Error(`Unexpected fetch URL: ${url}`);
  }, async () => {
    const result = await assertRollbackFlow(
      {
        apiBaseUrl: "https://api.example.com/api/v1",
        locale: "en-US",
        market: "us",
        requireRevalidation: true,
        slug: "smoke-page",
      },
      "access-token",
      {
        pageId: "page-1",
        title: "Smoke Page",
      },
    );

    assert.deepEqual(result, {
      revalidation: {
        diagnosis: "triggered",
        pathCount: 1,
        paths: ["/en/smoke-page"],
        reason: null,
        required: true,
        status: null,
        tagCount: 5,
        tags: [
          "published-page",
          "published-page:us:en-US",
          "published-page:us:en-US:smoke-page",
          "public-translation",
          "public-translation:en-US",
        ],
        triggered: true,
      },
      rollbackVersionId: "version-2",
      targetVersionId: "version-1",
      title: "Smoke Page",
    });
  });

  assert.deepEqual(
    calls.map((call) => call.method),
    ["GET", "POST", "POST", "GET"],
  );
  assert.deepEqual(
    calls.map((call) => call.redirect),
    ["manual", "manual", "manual", "manual"],
  );
});

async function withFetch(fetchImpl, fn) {
  const previous = globalThis.fetch;
  globalThis.fetch = fetchImpl;

  try {
    await fn();
  } finally {
    globalThis.fetch = previous;
  }
}

function jsonResponse(body) {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    status: 200,
    statusText: "OK",
  });
}
