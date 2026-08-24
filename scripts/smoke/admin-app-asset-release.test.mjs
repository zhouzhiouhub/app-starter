import assert from "node:assert/strict";
import test from "node:test";
import { assertAdminApp } from "./admin-app-smoke.mjs";

test("admin app smoke cancels static asset bodies after header checks", async () => {
  const canceledUrls = [];

  await withFetch(
    async (url) => {
      if (url === "https://admin.example.com") {
        return new Response(
          [
            '<div id="root"></div>',
            '<link rel="modulepreload" href="/assets/vendor.js">',
            '<link rel="stylesheet" href="/assets/admin.css">',
            '<script type="module" src="/assets/admin.js"></script>',
          ].join(""),
          {
            headers: { "content-type": "text/html; charset=utf-8" },
            status: 200,
            statusText: "OK",
          },
        );
      }

      if (url === "https://admin.example.com/assets/admin.js") {
        return createCancellableAssetResponse(url, canceledUrls, {
          contentType: "text/javascript; charset=utf-8",
          statusText: "OK",
        });
      }

      if (url === "https://admin.example.com/assets/vendor.js") {
        return createCancellableAssetResponse(url, canceledUrls, {
          contentType: "application/javascript; charset=utf-8",
          statusText: "OK",
        });
      }

      if (url === "https://admin.example.com/assets/admin.css") {
        return createCancellableAssetResponse(url, canceledUrls, {
          contentType: "text/css; charset=utf-8",
          statusText: "OK",
        });
      }

      throw new Error(`Unexpected URL: ${url}`);
    },
    async () => {
      await assertAdminApp({ adminUrl: "https://admin.example.com" });
    },
  );

  assert.deepEqual(canceledUrls.sort(), [
    "https://admin.example.com/assets/admin.css",
    "https://admin.example.com/assets/admin.js",
    "https://admin.example.com/assets/vendor.js",
  ]);
});

function createCancellableAssetResponse(
  url,
  canceledUrls,
  { contentType, statusText },
) {
  return new Response(
    new ReadableStream({
      cancel() {
        canceledUrls.push(url);
      },
    }),
    {
      headers: { "content-type": contentType },
      status: 200,
      statusText,
    },
  );
}

async function withFetch(fetchImpl, fn) {
  const previous = globalThis.fetch;
  globalThis.fetch = fetchImpl;

  try {
    await fn();
  } finally {
    globalThis.fetch = previous;
  }
}
