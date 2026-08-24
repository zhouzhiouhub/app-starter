import assert from "node:assert/strict";
import test from "node:test";
import {
  assertIndexableStorefrontPage,
  assertStorefrontPage,
  formatStorefrontPageAttempt,
  readStorefrontPageAttempt,
} from "./storefront-smoke.mjs";
import { createStorefrontSmokeRequestInit } from "./storefront-smoke-http.mjs";
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

  const redirected = readStorefrontPageAttempt(
    {
      ok: false,
      redirectLocation: "https://web.example.com/login?token=[redacted]",
      status: 302,
      statusText: "Found",
      text: "",
    },
    "Published title",
  );

  assert.deepEqual(redirected, {
    bodySnippet: null,
    diagnosis: "redirect-response",
    documentTitle: null,
    ok: false,
    redirectLocation: "https://web.example.com/login?token=[redacted]",
    status: 302,
    statusText: "Found",
    titlePresent: false,
  });
  assert.equal(
    formatStorefrontPageAttempt(redirected),
    "status 302 Found, diagnosis: redirect-response, title present: false, redirect: https://web.example.com/login?token=[redacted]",
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

test("storefront smoke requests disable automatic redirects", () => {
  assert.deepEqual(createStorefrontSmokeRequestInit({}), {
    redirect: "manual",
  });

  assert.deepEqual(
    createStorefrontSmokeRequestInit(
      {
        storefrontHost: "store.brand-platform.com",
      },
      {
        headers: { Accept: "text/html" },
        method: "GET",
      },
    ),
    {
      headers: {
        Accept: "text/html",
        "x-storefront-host": "store.brand-platform.com",
      },
      method: "GET",
      redirect: "manual",
    },
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

test("storefront page smoke rejects redirected storefront responses", async () => {
  await withFetch(
    async () =>
      new Response("", {
        headers: {
          location: "https://web.example.com/login?token=secret-token",
        },
        status: 302,
        statusText: "Found",
      }),
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
            error.message.includes("diagnosis: redirect-response"),
            true,
          );
          assert.deepEqual(error.smokeDetails.storefront, {
            bodySnippet: null,
            diagnosis: "redirect-response",
            documentTitle: null,
            expectedTitle: "Published title",
            ok: false,
            redirectLocation: "https://web.example.com/login?token=[redacted]",
            status: 302,
            statusText: "Found",
            titlePresent: false,
            url: "https://web.example.com/en/smoke-page",
          });

          return true;
        },
      );
    },
  );
});

test("storefront page smoke reports oversized storefront responses", async () => {
  await withFetch(
    async () =>
      new Response("x".repeat(1_000_001), {
        status: 200,
        statusText: "OK",
      }),
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
            error.message.includes("response-body-too-large"),
            true,
          );
          assert.deepEqual(error.smokeDetails.storefront, {
            bodySnippet: null,
            bodyReadError:
              "https://web.example.com/en/smoke-page returned a storefront response body larger than 1000000 bytes.",
            diagnosis: "response-body-too-large",
            documentTitle: null,
            expectedTitle: "Published title",
            ok: false,
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

test("storefront page SEO smoke reports noindex metadata", () => {
  assert.throws(
    () =>
      assertIndexableStorefrontPage(
        [
          "<html><head>",
          '<meta name="robots" content="noindex,nofollow" />',
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
    (error) => {
      assert.equal(
        error.message,
        "Storefront page rendered noindex robots metadata.",
      );
      assert.deepEqual(error.smokeDetails.storefrontSeo, {
        diagnosis: "noindex-page",
        url: "https://web.example.com/en/smoke-page",
      });

      return true;
    },
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
        diagnosis: "canonical-mismatch",
        expectedCanonicalUrl: "https://store.brand-platform.com/en/smoke-page",
        url: "https://web.example.com/en/smoke-page",
      });

      return true;
    },
  );
});
