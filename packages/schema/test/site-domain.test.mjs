import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeSiteDomain,
  readSiteDomainHeader,
  readSiteDomainIssue,
  readSiteDomainValidationError,
  storefrontHostHeaderName,
} from "../dist/index.js";

test("site domain helper accepts localhost and public hostnames", () => {
  assert.equal(
    normalizeSiteDomain(" Store.Brand-Platform.com:8080 "),
    "store.brand-platform.com:8080",
  );
  assert.equal(
    normalizeSiteDomain(" Store.Brand-Platform.com:443 "),
    "store.brand-platform.com",
  );
  assert.equal(normalizeSiteDomain("localhost:80"), "localhost");
  assert.equal(readSiteDomainIssue("localhost"), null);
  assert.equal(readSiteDomainIssue("localhost:3000"), null);
  assert.equal(readSiteDomainIssue("store.brand-platform.com"), null);
  assert.equal(readSiteDomainIssue("store.brand-platform.com:8080"), null);
});

test("site domain helper rejects URL-shaped domains", () => {
  assert.equal(readSiteDomainIssue(""), "empty");
  assert.equal(
    readSiteDomainIssue("https://store.brand-platform.com"),
    "protocol",
  );
  assert.equal(
    readSiteDomainIssue("store.brand-platform.com/path"),
    "url-parts",
  );
  assert.equal(
    readSiteDomainIssue("store.brand-platform.com?preview=1"),
    "url-parts",
  );
  assert.equal(
    readSiteDomainIssue("store.brand-platform.com#section"),
    "url-parts",
  );
  assert.equal(readSiteDomainIssue("store brand-platform.com"), "url-parts");
});

test("site domain helper rejects invalid and unsafe hosts", () => {
  for (const value of [
    "store_.brand-platform.com",
    "store.brand-platform.com:0",
    "store.brand-platform.com:65536",
  ]) {
    assert.equal(readSiteDomainIssue(value), "invalid-host");
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
    assert.equal(readSiteDomainIssue(value), "unsafe-host");
  }
});

test("site domain helper exposes stable validation messages", () => {
  assert.match(
    readSiteDomainValidationError("store.example.com") ?? "",
    /public hostname/,
  );
  assert.equal(readSiteDomainValidationError("store.brand-platform.com"), null);
});

test("site domain header helper reads one safe storefront host", () => {
  assert.equal(storefrontHostHeaderName, "x-storefront-host");
  assert.equal(
    readSiteDomainHeader(" Store.Brand-Platform.com:443 "),
    "store.brand-platform.com",
  );
  assert.equal(readSiteDomainHeader(["localhost:3000"]), "localhost:3000");

  for (const value of [
    "",
    ["store.brand-platform.com", "other.brand-platform.com"],
    "store.brand-platform.com, other.brand-platform.com",
    "https://store.brand-platform.com",
    "store.example.com",
    "127.0.0.1",
  ]) {
    assert.equal(readSiteDomainHeader(value), null);
  }
});
