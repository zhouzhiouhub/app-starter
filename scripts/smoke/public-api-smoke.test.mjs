import assert from "node:assert/strict";
import test from "node:test";
import {
  assertPublicApi,
  formatPublicPageBodyDiagnostic,
  isPublicPageFallbackResponse,
  readPublicPageBodyDiagnostic,
} from "./public-api-smoke.mjs";
import { withFetch } from "./smoke-test-runtime.mjs";

test("public API smoke helper validates fallback response metadata", () => {
  assert.equal(
    isPublicPageFallbackResponse(
      {
        data: {
          meta: {
            title: "Smoke Page",
          },
        },
        meta: {
          fallbackLocale: "en-US",
          isFallback: true,
          locale: "en-US",
        },
      },
      {
        locale: "en-US",
        title: "Smoke Page",
      },
    ),
    true,
  );
  assert.equal(
    isPublicPageFallbackResponse(
      {
        data: {
          meta: {
            title: "Smoke Page",
          },
        },
        meta: {
          fallbackLocale: "en-US",
          isFallback: false,
          locale: "en-US",
        },
      },
      {
        locale: "en-US",
        title: "Smoke Page",
      },
    ),
    false,
  );
});

test("public API smoke helper summarizes page body mismatches", () => {
  const diagnostic = readPublicPageBodyDiagnostic(
    {
      data: {
        meta: {
          title: "Draft Page",
        },
        seo: {
          noIndex: true,
        },
      },
      meta: {
        fallbackLocale: "en-US",
        isFallback: false,
        locale: "de-DE",
      },
    },
    {
      expectedFallback: true,
      expectedLocale: "en-US",
      expectedTitle: "Published Page",
    },
  );

  assert.deepEqual(diagnostic, {
    diagnosis: "title-mismatch",
    expectedFallback: true,
    expectedLocale: "en-US",
    expectedTitle: "Published Page",
    fallbackLocale: "en-US",
    fallbackMatches: false,
    isFallback: false,
    locale: "de-DE",
    localeMatches: false,
    noIndex: true,
    title: "Draft Page",
    titleMatches: false,
  });
  assert.equal(
    formatPublicPageBodyDiagnostic(diagnostic),
    "title: Draft Page (expected Published Page), locale: de-DE (expected en-US), fallback: false (expected true), fallback locale: en-US, noIndex: true",
  );
});

test("public API smoke failures keep structured diagnostics", async () => {
  await withFetch(
    async () =>
      new Response(
        JSON.stringify({
          data: {
            meta: {
              title: "Draft Page",
            },
            seo: {
              noIndex: false,
            },
          },
          meta: {
            fallbackLocale: "en-US",
            isFallback: false,
            locale: "en-US",
          },
        }),
        {
          headers: { "Content-Type": "application/json" },
          status: 200,
          statusText: "OK",
        },
      ),
    async () => {
      await assert.rejects(
        () =>
          assertPublicApi(
            {
              apiBaseUrl: "https://api.example.com",
              locale: "en-US",
              market: "us",
              slug: "smoke-page",
            },
            "Published Page",
          ),
        (error) => {
          assert.match(error.message, /published title/);
          assert.deepEqual(error.smokeDetails.publicApi, {
            diagnosis: "title-mismatch",
            expectedFallback: false,
            expectedLocale: "en-US",
            expectedTitle: "Published Page",
            fallbackLocale: "en-US",
            fallbackMatches: true,
            isFallback: false,
            locale: "en-US",
            localeMatches: true,
            noIndex: false,
            title: "Draft Page",
            titleMatches: false,
          });
          return true;
        },
      );
    },
  );
});

test("public API smoke forwards the configured storefront host", async () => {
  const calls = [];

  await withFetch(
    async (url, init = {}) => {
      calls.push({ headers: init.headers ?? {}, url });

      return new Response(
        JSON.stringify({
          data: {
            meta: {
              title: "Published Page",
            },
            seo: {
              noIndex: false,
            },
          },
          meta: {
            fallbackLocale: "en-US",
            isFallback: false,
            locale: "en-US",
          },
        }),
        {
          headers: { "Content-Type": "application/json" },
          status: 200,
          statusText: "OK",
        },
      );
    },
    async () => {
      await assertPublicApi(
        {
          apiBaseUrl: "https://api.example.com",
          locale: "en-US",
          market: "us",
          slug: "smoke-page",
          storefrontHost: "store.brand-platform.com",
        },
        "Published Page",
      );
    },
  );

  assert.deepEqual(calls, [
    {
      headers: {
        "x-storefront-host": "store.brand-platform.com",
      },
      url: "https://api.example.com/public/pages/smoke-page?locale=en-US&market=us",
    },
  ]);
});
