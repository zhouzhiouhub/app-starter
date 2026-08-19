import assert from "node:assert/strict";
import test from "node:test";
import {
  formatPublicPageBodyDiagnostic,
  isPublicPageFallbackResponse,
  readPublicPageBodyDiagnostic,
} from "./public-api-smoke.mjs";

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
