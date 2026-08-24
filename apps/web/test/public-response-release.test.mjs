import assert from "node:assert/strict";
import test from "node:test";
import { readPublicApiJson } from "../src/lib/public-api-response.ts";
import {
  getPreviewPage,
  getPublishedPage,
} from "../src/lib/published-page.ts";
import { listPublishedPages } from "../src/lib/published-pages.ts";
import { getPublicTranslationMessages } from "../src/lib/public-translations.ts";

test("public API JSON reader cancels oversized response bodies", async () => {
  const canceledLabels = [];

  assert.equal(
    await readPublicApiJson(
      cancellableResponse(200, "oversized-json", canceledLabels, {
        "Content-Length": "1000001",
      }),
    ),
    null,
  );

  assert.deepEqual(canceledLabels, ["oversized-json"]);
});

test("published page failure responses are released", async () => {
  const canceledLabels = [];

  await withFetch(
    async () => cancellableResponse(502, "published-page", canceledLabels),
    async () => {
      assert.equal(
        await getPublishedPage({
          locale: "en-US",
          slug: "home",
        }),
        null,
      );
    },
  );

  assert.deepEqual(canceledLabels, ["published-page"]);
});

test("preview page failure responses are released", async () => {
  const canceledLabels = [];

  await withFetch(
    async () => cancellableResponse(403, "preview-page", canceledLabels),
    async () => {
      assert.equal(await getPreviewPage(`payload.${"a".repeat(43)}`), null);
    },
  );

  assert.deepEqual(canceledLabels, ["preview-page"]);
});

test("published page list failure responses are released", async () => {
  const canceledLabels = [];

  await withFetch(
    async () => cancellableResponse(503, "published-pages", canceledLabels),
    async () => {
      assert.deepEqual(
        await listPublishedPages({
          locale: "en-US",
          market: "us",
        }),
        [],
      );
    },
  );

  assert.deepEqual(canceledLabels, ["published-pages"]);
});

test("public translation failure responses are released", async () => {
  const canceledLabels = [];

  await withFetch(
    async () => cancellableResponse(504, "translations", canceledLabels),
    async () => {
      assert.deepEqual(
        await getPublicTranslationMessages({
          locale: "en-US",
        }),
        {},
      );
    },
  );

  assert.deepEqual(canceledLabels, ["translations"]);
});

function cancellableResponse(status, label, canceledLabels, headers = {}) {
  return new Response(
    new ReadableStream({
      cancel() {
        canceledLabels.push(label);
      },
    }),
    { headers, status },
  );
}

async function withFetch(fetchImplementation, fn) {
  const previous = globalThis.fetch;
  globalThis.fetch = fetchImplementation;

  try {
    return await fn();
  } finally {
    globalThis.fetch = previous;
  }
}
