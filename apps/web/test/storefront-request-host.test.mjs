import assert from "node:assert/strict";
import test from "node:test";
import { readStorefrontHostFromHeaders } from "../src/lib/storefront-request-headers.ts";

test("storefront request host prefers forwarded hosts over raw hosts", () => {
  const host = readStorefrontHostFromHeaders(
    headers({
      host: "internal.localhost",
      "x-forwarded-host": "Store.Brand-Platform.com:443",
    }),
  );

  assert.equal(host, "store.brand-platform.com");
});

test("storefront request host prefers explicit storefront hosts", () => {
  const host = readStorefrontHostFromHeaders(
    headers({
      host: "store-a.brand-platform.com",
      "x-forwarded-host": "store-b.brand-platform.com",
      "x-storefront-host": "store-c.brand-platform.com",
    }),
  );

  assert.equal(host, "store-c.brand-platform.com");
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

function headers(values) {
  return {
    get(name) {
      return values[name.toLowerCase()] ?? null;
    },
  };
}
