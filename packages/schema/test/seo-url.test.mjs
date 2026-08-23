import assert from "node:assert/strict";
import test from "node:test";
import {
  isSeoUrl,
  seoImageUrlSchema,
  seoUrlSchema,
} from "../dist/index.js";

test("SEO URL schema accepts relative and http URLs", () => {
  assert.equal(seoUrlSchema.parse(" /en/product "), "/en/product");
  assert.equal(isSeoUrl("https://example.com/en/product"), true);
  assert.equal(isSeoUrl("http://example.com/en/product"), true);
  assert.equal(isSeoUrl("/en/product?variant=summer"), true);
  assert.equal(isSeoUrl("https://example.com/en/product?variant=summer"), true);
});

test("SEO URL schema rejects unsafe URL forms", () => {
  assert.equal(isSeoUrl("https://example.com\njavascript:alert(1)"), false);
  assert.equal(isSeoUrl("https://user:pass@example.com/page"), false);
  assert.equal(isSeoUrl("//evil.example.com/page"), false);
  assert.equal(isSeoUrl("#section"), false);
  assert.equal(isSeoUrl("mailto:hello@example.com"), false);
  assert.throws(() =>
    seoUrlSchema.parse("https://example.com\njavascript:alert(1)"),
  );
});

test("SEO URL schema rejects sensitive query parameters", () => {
  for (const url of [
    "/en/product?token=secret",
    "/en/product?preview_token=secret",
    "https://example.com/en/product?access_token=secret",
    "https://example.com/en/product?client-secret=secret",
    "https://example.com/en/product?X-Amz-Signature=secret",
    "https://example.com/en/product?Key-Pair-Id=key",
    "https://example.com/en/product?sig=secret",
  ]) {
    assert.equal(isSeoUrl(url), false);
  }
});

test("SEO image URL schema keeps media references but rejects unsafe URLs", () => {
  assert.equal(seoImageUrlSchema.parse("media://asset-1"), "media://asset-1");
  assert.throws(() =>
    seoImageUrlSchema.parse("https://example.com\njavascript:alert(1)"),
  );
  assert.throws(() =>
    seoImageUrlSchema.parse("https://example.com/og.jpg?token=secret"),
  );
});
