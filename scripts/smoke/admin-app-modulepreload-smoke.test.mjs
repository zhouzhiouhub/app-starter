import assert from "node:assert/strict";
import test from "node:test";
import { readModulePreloadReferences } from "./admin-app-modulepreload-assets.mjs";
import { assertAdminApp } from "./admin-app-smoke.mjs";

test("admin app smoke rejects cross-origin modulepreload assets", async () => {
  const requestedUrls = [];

  await withFetch(
    async (url) => {
      requestedUrls.push(url);

      if (url === "https://admin.example.com") {
        return new Response(
          [
            '<div id="root"></div>',
            '<link rel="modulepreload" href="https://cdn.example.com/vendor.js">',
            '<link rel="stylesheet" href="/assets/admin.css">',
            '<script type="module" src="/assets/admin.js"></script>',
          ].join(""),
          {
            headers: { "content-type": "text/html" },
            status: 200,
            statusText: "OK",
          },
        );
      }

      if (url === "https://admin.example.com/assets/admin.js") {
        return new Response("console.log('admin')", {
          headers: { "content-type": "text/javascript" },
          status: 200,
          statusText: "OK",
        });
      }

      if (url === "https://admin.example.com/assets/admin.css") {
        return new Response("body{margin:0}", {
          headers: { "content-type": "text/css" },
          status: 200,
          statusText: "OK",
        });
      }

      throw new Error(`Unexpected URL: ${url}`);
    },
    async () => {
      await assert.rejects(
        () => assertAdminApp({ adminUrl: "https://admin.example.com" }),
        (error) => {
          assert.equal(error.smokeDetails.adminApp.modulePreloadCount, 1);
          assert.equal(error.smokeDetails.adminApp.modulePreloadOk, false);
          assert.deepEqual(
            error.smokeDetails.adminApp.modulePreloadUrlIssues,
            [
              {
                href: "https://cdn.example.com/vendor.js",
                issue: "cross-origin",
              },
            ],
          );
          assert.match(error.message, /modulepreload URL issue: cross-origin/);
          return true;
        },
      );
    },
  );

  assert.deepEqual(requestedUrls, [
    "https://admin.example.com",
    "https://admin.example.com/assets/admin.js",
    "https://admin.example.com/assets/admin.css",
  ]);
});

test("admin app smoke bounds modulepreload href diagnostics", () => {
  const [reference] = readModulePreloadReferences(
    `<link rel="modulepreload" href="https://user:secret@cdn.example.com/${"x".repeat(
      700,
    )}">`,
    "https://admin.example.com",
  );

  assert.equal(reference.href.length, 512);
  assert.equal(reference.href.endsWith("..."), true);
  assert.equal(reference.href.includes("user:secret"), false);
  assert.match(reference.href, /https:\/\/\[redacted\]@cdn\.example\.com/);
  assert.equal(reference.issue, "embedded-credentials");
  assert.equal(reference.url, null);
});

test("admin app smoke rejects unreachable or non-JavaScript modulepreload assets", async () => {
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
            headers: { "content-type": "text/html" },
            status: 200,
            statusText: "OK",
          },
        );
      }

      if (url === "https://admin.example.com/assets/admin.js") {
        return new Response("console.log('admin')", {
          headers: { "content-type": "text/javascript" },
          status: 200,
          statusText: "OK",
        });
      }

      if (url === "https://admin.example.com/assets/vendor.js") {
        return new Response("not found", {
          headers: { "content-type": "text/html" },
          status: 404,
          statusText: "Not Found",
        });
      }

      if (url === "https://admin.example.com/assets/admin.css") {
        return new Response("body{margin:0}", {
          headers: { "content-type": "text/css" },
          status: 200,
          statusText: "OK",
        });
      }

      throw new Error(`Unexpected URL: ${url}`);
    },
    async () => {
      await assert.rejects(
        () => assertAdminApp({ adminUrl: "https://admin.example.com" }),
        (error) => {
          assert.equal(error.smokeDetails.adminApp.modulePreloadOk, false);
          assert.deepEqual(error.smokeDetails.adminApp.modulePreloadFailures, [
            {
              contentType: "text/html",
              errorMessage: null,
              hasJavaScriptContentType: false,
              status: 404,
              statusText: "Not Found",
              url: "https://admin.example.com/assets/vendor.js",
            },
          ]);
          assert.match(
            error.message,
            /modulepreload status: 404 Not Found/,
          );
          assert.match(error.message, /modulepreload JavaScript: false/);
          return true;
        },
      );
    },
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
