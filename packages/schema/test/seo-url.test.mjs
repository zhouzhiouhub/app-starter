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

test("SEO image URL schema keeps media references but rejects unsafe URLs", () => {
  assert.equal(seoImageUrlSchema.parse("media://asset-1"), "media://asset-1");
  assert.throws(() =>
    seoImageUrlSchema.parse("https://example.com\njavascript:alert(1)"),
  );
});
