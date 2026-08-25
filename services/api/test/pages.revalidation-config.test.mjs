import assert from "node:assert/strict";
import test from "node:test";
import {
  isProductionRevalidationEnvironment,
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

test("storefront revalidation URL resolver accepts production HTTPS endpoints", () => {
  assert.equal(
    resolveStorefrontRevalidateUrl({
      NODE_ENV: "production",
      STOREFRONT_REVALIDATE_URL:
        " https://store.brand-platform.com/api/revalidate/ ",
      WEB_URL: "https://fallback.brand-platform.com/",
    }),
    "https://store.brand-platform.com/api/revalidate",
  );
  assert.equal(
    resolveStorefrontRevalidateUrl({
      NODE_ENV: "production",
      STOREFRONT_REVALIDATE_URL: "",
      WEB_URL: "https://store.brand-platform.com/",
    }),
    "https://store.brand-platform.com/api/revalidate",
  );
});

test("storefront revalidation URL resolver treats deployment production markers as production", () => {
  assert.equal(
    isProductionRevalidationEnvironment({ APP_ENV: " production " }),
    true,
  );
  assert.equal(
    isProductionRevalidationEnvironment({ VERCEL_ENV: "production" }),
    true,
  );
  assert.equal(
    isProductionRevalidationEnvironment({ NODE_ENV: "development" }),
    false,
  );
  assert.equal(
    resolveStorefrontRevalidateUrl({
      APP_ENV: "production",
      STOREFRONT_REVALIDATE_URL:
        "http://store.brand-platform.com/api/revalidate",
      WEB_URL: "",
    }),
    null,
  );
  assert.equal(
    resolveStorefrontRevalidateUrl({
      STOREFRONT_REVALIDATE_URL: "",
      VERCEL_ENV: "production",
      WEB_URL: "https://store.brand-platform.com/",
    }),
    "https://store.brand-platform.com/api/revalidate",
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
      STOREFRONT_REVALIDATE_URL: "https://web.brand-platform.com/login",
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

test("storefront revalidation URL resolver rejects unsafe production endpoints", () => {
  for (const values of [
    {
      NODE_ENV: "production",
      STOREFRONT_REVALIDATE_URL:
        "http://store.brand-platform.com/api/revalidate",
      WEB_URL: "",
    },
    {
      NODE_ENV: "production",
      STOREFRONT_REVALIDATE_URL: "https://localhost/api/revalidate",
      WEB_URL: "",
    },
    {
      NODE_ENV: "production",
      STOREFRONT_REVALIDATE_URL: "https://store.example/api/revalidate",
      WEB_URL: "",
    },
    {
      NODE_ENV: "production",
      STOREFRONT_REVALIDATE_URL: "",
      WEB_URL: "https://192.0.2.10",
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
