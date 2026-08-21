import assert from "node:assert/strict";
import test from "node:test";
import {
  readStorefrontRevalidationTimeoutMs,
  resolveStorefrontRevalidateUrl,
} from "../dist/modules/pages/pages.revalidation.js";

test("storefront revalidation URL resolver normalizes safe URLs", () => {
  assert.equal(
    resolveStorefrontRevalidateUrl({
      STOREFRONT_REVALIDATE_URL: " https://web.example.com/api/revalidate/ ",
      WEB_URL: "https://fallback.example.com/",
    }),
    "https://web.example.com/api/revalidate",
  );
  assert.equal(
    resolveStorefrontRevalidateUrl({
      STOREFRONT_REVALIDATE_URL: "",
      WEB_URL: "https://web.example.com/storefront/",
    }),
    "https://web.example.com/api/revalidate",
  );
  assert.equal(
    resolveStorefrontRevalidateUrl({
      STOREFRONT_REVALIDATE_URL: " https://web.example.com/ ",
      WEB_URL: "",
    }),
    "https://web.example.com/api/revalidate",
  );
});

test("storefront revalidation URL resolver rejects unsafe URLs", () => {
  for (const values of [
    {
      STOREFRONT_REVALIDATE_URL: "javascript:alert(1)",
      WEB_URL: "https://web.example.com/",
    },
    {
      STOREFRONT_REVALIDATE_URL:
        "https://user:pass@web.example.com/api/revalidate",
      WEB_URL: "",
    },
    {
      STOREFRONT_REVALIDATE_URL:
        "https://web.example.com/api/revalidate?secret=1",
      WEB_URL: "",
    },
    {
      STOREFRONT_REVALIDATE_URL: "",
      WEB_URL: "ftp://web.example.com",
    },
    {
      STOREFRONT_REVALIDATE_URL: "",
      WEB_URL: "https://user:pass@web.example.com",
    },
  ]) {
    assert.equal(resolveStorefrontRevalidateUrl(values), null);
  }
});

test("storefront revalidation timeout config stays bounded", () => {
  assert.equal(
    readStorefrontRevalidationTimeoutMs({
      STOREFRONT_REVALIDATE_TIMEOUT_MS: " 15000 ",
    }),
    15000,
  );
  assert.equal(
    readStorefrontRevalidationTimeoutMs({
      STOREFRONT_REVALIDATE_TIMEOUT_MS: "30000",
    }),
    30000,
  );

  for (const value of [
    "",
    "0",
    "-1",
    "1.5",
    "1e9",
    "30001",
    "Infinity",
    "later",
  ]) {
    assert.equal(
      readStorefrontRevalidationTimeoutMs({
        STOREFRONT_REVALIDATE_TIMEOUT_MS: value,
      }),
      5000,
    );
  }
});
