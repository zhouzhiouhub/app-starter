import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeSafeStorefrontHost,
  normalizeStorefrontHostValue,
  readSafeStorefrontHost,
  readStorefrontHostIssue,
} from "./storefront-host-validation.mjs";

test("storefront host validation accepts localhost and public hostnames", () => {
  assert.equal(
    normalizeStorefrontHostValue(" Store.Brand-Platform.com:8080 "),
    "store.brand-platform.com:8080",
  );
  assert.equal(
    normalizeSafeStorefrontHost(" Store.Brand-Platform.com:443 "),
    "store.brand-platform.com",
  );
  assert.equal(normalizeSafeStorefrontHost("localhost:80"), "localhost");
  assert.equal(readStorefrontHostIssue("localhost"), null);
  assert.equal(readStorefrontHostIssue("localhost:3000"), null);
  assert.equal(readStorefrontHostIssue("store.brand-platform.com"), null);
  assert.equal(readStorefrontHostIssue("store.brand-platform.com:8080"), null);
});

test("storefront host validation rejects URL-shaped hosts", () => {
  assert.equal(readStorefrontHostIssue(""), "empty");
  assert.equal(
    readStorefrontHostIssue("https://store.brand-platform.com"),
    "protocol",
  );
  assert.equal(
    readStorefrontHostIssue("store.brand-platform.com/path"),
    "url-parts",
  );
  assert.equal(
    readStorefrontHostIssue("store.brand-platform.com?preview=1"),
    "url-parts",
  );
  assert.equal(
    readStorefrontHostIssue("store.brand-platform.com#section"),
    "url-parts",
  );
  assert.equal(
    readStorefrontHostIssue("store brand-platform.com"),
    "url-parts",
  );
});

test("storefront host validation rejects invalid and unsafe hosts", () => {
  for (const value of [
    "store_.brand-platform.com",
    "store.brand-platform.com:0",
    "store.brand-platform.com:65536",
  ]) {
    assert.equal(readStorefrontHostIssue(value), "invalid-host");
  }

  for (const value of [
    "127.0.0.1",
    "10.0.0.1",
    "host.docker.internal",
    "store.example",
    "store.example.com",
    "192.0.2.10",
    "invalid",
    "test",
  ]) {
    assert.equal(readStorefrontHostIssue(value), "unsafe-host");
  }
});

test("storefront host validation reads exactly one safe host value", () => {
  assert.equal(
    readSafeStorefrontHost(" Store.Brand-Platform.com:443 "),
    "store.brand-platform.com",
  );
  assert.equal(readSafeStorefrontHost(["localhost:3000"]), "localhost:3000");

  for (const value of [
    "",
    ["store.brand-platform.com", "other.brand-platform.com"],
    ["store.brand-platform.com\n"],
    "store.brand-platform.com, other.brand-platform.com",
    "store.brand-platform.com\n",
    "store.brand-platform.com\nx-forwarded-host: other.brand-platform.com",
    "\tstore.brand-platform.com",
    "store.brand-platform.com\tother.brand-platform.com",
    "store.brand-platform.com\x7f",
    "https://store.brand-platform.com",
    "store.example.com",
    "127.0.0.1",
  ]) {
    assert.equal(readSafeStorefrontHost(value), null);
  }
});
