import assert from "node:assert/strict";
import test from "node:test";
import { isPublicPageFallbackResponse } from "./public-api-smoke.mjs";

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
