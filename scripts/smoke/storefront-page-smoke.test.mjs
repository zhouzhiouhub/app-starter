import assert from "node:assert/strict";
import test from "node:test";
import {
  assertIndexableStorefrontPage,
  assertStorefrontPage,
  formatStorefrontPageAttempt,
  readStorefrontPageAttempt,
} from "./storefront-smoke.mjs";
import { withFetch } from "./smoke-test-runtime.mjs";

test("smoke helpers summarize storefront page attempts", () => {
  const failed = readStorefrontPageAttempt(
    {
      ok: false,
      status: 503,
      statusText: "Service Unavailable",
      text: "<html>\n<body>Storefront render failed</body>\n</html>",
    },
    "Published title",
  );

  assert.deepEqual(failed, {
    bodySnippet: "<html> <body>Storefront render failed</body> </html>",
    diagnosis: "http-error",
    documentTitle: null,
    ok: false,
    status: 503,
    statusText: "Service Unavailable",
    titlePresent: false,
  });
  assert.equal(
    formatStorefrontPageAttempt(failed),
    'status 503 Service Unavailable, diagnosis: http-error, title present: false, body: "<html> <body>Storefront render failed</body> </html>"',
  );

  const stale = readStorefrontPageAttempt(
    {
      ok: true,
      status: 200,
      statusText: "OK",
      text: "<html><head><title>Previous campaign</title></head><body>Old page content</body></html>",
    },
    "Published title",
  );

  assert.deepEqual(stale, {
    bodySnippet:
      "<html><head><title>Previous campaign</title></head><body>Old page content</body></html>",
    diagnosis: "stale-or-fallback-content",
    documentTitle: "Previous campaign",
    ok: true,
    status: 200,
    statusText: "OK",
    titlePresent: false,
  });
  assert.equal(
    formatStorefrontPageAttempt(stale),
    'status 200 OK, diagnosis: stale-or-fallback-content, title present: false, document title: "Previous campaign", body: "<html><head><title>Previous campaign</title></head><body>Old page content</body></html>"',
  );
});

test("storefront page smoke failure keeps structured diagnostics", async () => {
  await withFetch(
    async () =>
      new Response(
        "<html><head><title>Previous campaign</title></head><body>Old page content</body></html>",
        {
          status: 200,
          statusText: "OK",
        },
      ),
    async () => {
      await assert.rejects(
        () =>
          assertStorefrontPage(
            {
              locale: "en-US",
              retryAttempts: 1,
              retryDelayMs: 1,
              slug: "smoke-page",
              webUrl: "https://web.example.com",
            },
            "Published title",
          ),
        (error) => {
          assert.equal(
            error.message.includes("stale-or-fallback-content"),
            true,
          );
          assert.deepEqual(error.smokeDetails.storefront, {
            bodySnippet:
              "<html><head><title>Previous campaign</title></head><body>Old page content</body></html>",
            diagnosis: "stale-or-fallback-content",
            documentTitle: "Previous campaign",
            expectedTitle: "Published title",
            ok: true,
            status: 200,
            statusText: "OK",
            titlePresent: false,
            url: "https://web.example.com/en/smoke-page",
          });

          return true;
        },
      );
    },
  );
});

test("storefront page smoke forwards the configured storefront host", async () => {
  const calls = [];

  await withFetch(
    async (url, init = {}) => {
      calls.push({ headers: init.headers ?? {}, method: init.method, url });

      return new Response(
        "<html><head><title>Published title</title></head><body>Published title</body></html>",
        {
          status: 200,
          statusText: "OK",
        },
      );
    },
    async () => {
      await assertStorefrontPage(
        {
          locale: "en-US",
          retryAttempts: 1,
          retryDelayMs: 1,
          slug: "smoke-page",
          storefrontHost: "store.brand-platform.com",
          webUrl: "https://web.example.com",
        },
        "Published title",
      );
    },
  );

  assert.deepEqual(calls, [
    {
      headers: {
        "x-storefront-host": "store.brand-platform.com",
      },
      method: "GET",
      url: "https://web.example.com/en/smoke-page",
    },
  ]);
});

test("storefront page SEO smoke accepts the expected canonical URL", () => {
  assert.doesNotThrow(() =>
    assertIndexableStorefrontPage(
      [
        "<html><head>",
        '<link rel="canonical" href="https://store.brand-platform.com/en/smoke-page" />',
        "</head></html>",
      ].join(""),
      {
        locale: "en-US",
        slug: "smoke-page",
        storefrontHost: "store.brand-platform.com",
        webUrl: "https://web.example.com",
      },
    ),
  );
});

test("storefront page SEO smoke reports canonical mismatches", () => {
  assert.throws(
    () =>
      assertIndexableStorefrontPage(
        [
          "<html><head>",
          '<link rel="canonical" href="https://web.example.com/en/smoke-page" />',
          "</head></html>",
        ].join(""),
        {
          locale: "en-US",
          slug: "smoke-page",
          storefrontHost: "store.brand-platform.com",
          webUrl: "https://web.example.com",
        },
      ),
    (error) => {
      assert.deepEqual(error.smokeDetails.storefrontSeo, {
        canonicalHref: "https://web.example.com/en/smoke-page",
        expectedCanonicalUrl: "https://store.brand-platform.com/en/smoke-page",
        url: "https://web.example.com/en/smoke-page",
      });

      return true;
    },
  );
});
