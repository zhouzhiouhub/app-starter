import assert from "node:assert/strict";
import test from "node:test";
import { resolveStorefrontOrigin } from "../src/lib/site-url.ts";

test("storefront origin resolves safe public hosts as HTTPS", () => {
  assert.equal(
    resolveStorefrontOrigin("Store.Brand-Platform.com:443"),
    "https://store.brand-platform.com",
  );
  assert.equal(
    resolveStorefrontOrigin("store.brand-platform.com:8443"),
    "https://store.brand-platform.com:8443",
  );
});

test("storefront origin resolves localhost as HTTP", () => {
  assert.equal(resolveStorefrontOrigin("localhost"), "http://localhost");
  assert.equal(
    resolveStorefrontOrigin("localhost:3000"),
    "http://localhost:3000",
  );
});

test("storefront origin ignores unsafe hosts", () => {
  assert.equal(resolveStorefrontOrigin("store.example.com"), null);
  assert.equal(resolveStorefrontOrigin("127.0.0.1"), null);
  assert.equal(
    resolveStorefrontOrigin("https://store.brand-platform.com"),
    null,
  );
});
