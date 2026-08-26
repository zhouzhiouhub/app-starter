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

test("admin app smoke bounds static asset URL diagnostics without changing requests", async () => {
  const requestedUrls = [];
  const scriptPath = `/assets/${"s".repeat(620)}.js`;
  const preloadPath = `/assets/${"p".repeat(620)}.js`;
  const stylesheetPath = `/assets/${"c".repeat(620)}.css`;
  const scriptUrl = `https://admin.example.com${scriptPath}`;
  const preloadUrl = `https://admin.example.com${preloadPath}`;
  const stylesheetUrl = `https://admin.example.com${stylesheetPath}`;

  await withFetch(
    async (url) => {
      requestedUrls.push(url);

      if (url === "https://admin.example.com") {
        return new Response(
          [
            '<div id="root"></div>',
            `<link rel="modulepreload" href="${preloadPath}">`,
            `<link rel="stylesheet" href="${stylesheetPath}">`,
            `<script type="module" src="${scriptPath}"></script>`,
          ].join(""),
          {
            headers: { "content-type": "text/html; charset=utf-8" },
            status: 200,
            statusText: "OK",
          },
        );
      }

      if (url === scriptUrl || url === preloadUrl) {
        return createCancellableAssetResponse(url, [], {
          contentType: "text/javascript; charset=utf-8",
          statusText: "OK",
        });
      }

      if (url === stylesheetUrl) {
        return createCancellableAssetResponse(url, [], {
          contentType: "text/css; charset=utf-8",
          statusText: "OK",
        });
      }

      throw new Error(`Unexpected URL: ${url}`);
    },
    async () => {
      const attempt = await assertAdminApp({
        adminUrl: "https://admin.example.com",
      });

      assert.equal(attempt.moduleScriptUrl.length, 512);
      assert.equal(attempt.moduleScriptUrl.endsWith("..."), true);
      assert.equal(attempt.modulePreloadUrls[0].length, 512);
      assert.equal(attempt.modulePreloadUrls[0].endsWith("..."), true);
      assert.equal(attempt.stylesheetUrls[0].length, 512);
      assert.equal(attempt.stylesheetUrls[0].endsWith("..."), true);
    },
  );

  assert.deepEqual(requestedUrls.sort(), [
    "https://admin.example.com",
    preloadUrl,
    scriptUrl,
    stylesheetUrl,
  ].sort());
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
