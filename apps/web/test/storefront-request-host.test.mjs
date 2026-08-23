import assert from "node:assert/strict";
import test from "node:test";
import { readStorefrontHostFromHeaders } from "../src/lib/storefront-request-headers.ts";

test("storefront request host prefers safe raw hosts", () => {
  const host = readStorefrontHostFromHeaders(
    headers({
      host: "Store.Brand-Platform.com:443",
      "x-forwarded-host": "other.brand-platform.com",
    }),
  );

  assert.equal(host, "store.brand-platform.com");
});

test("storefront request host falls back to forwarded hosts", () => {
  const host = readStorefrontHostFromHeaders(
    headers({
      host: "internal.localhost",
      "x-forwarded-host": "Store.Brand-Platform.com:443",
    }),
  );

  assert.equal(host, "store.brand-platform.com");
});

test("storefront request host ignores external storefront host headers", () => {
  const host = readStorefrontHostFromHeaders(
    headers({
      host: "store-a.brand-platform.com",
      "x-forwarded-host": "store-b.brand-platform.com",
      "x-storefront-host": "store-c.brand-platform.com",
    }),
  );

  assert.equal(host, "store-a.brand-platform.com");
});

test("storefront request host skips unsafe forwarded hosts", () => {
  const host = readStorefrontHostFromHeaders(
    headers({
      host: "Store.Brand-Platform.com",
      "x-forwarded-host": "store.example.com",
    }),
  );

  assert.equal(host, "store.brand-platform.com");
});

test("storefront request host skips header values with control characters", () => {
  const host = readStorefrontHostFromHeaders(
    headers({
      host: "Store.Brand-Platform.com\nx-forwarded-host: bad.example.com",
      "x-forwarded-host": "safe.brand-platform.com",
    }),
  );

  assert.equal(host, "safe.brand-platform.com");
});

function headers(values) {
  return {
    get(name) {
      return values[name.toLowerCase()] ?? null;
    },
  };
}
