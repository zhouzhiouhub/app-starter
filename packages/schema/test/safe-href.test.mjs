import assert from "node:assert/strict";
import test from "node:test";
import { isSafeHref, safeHrefSchema } from "../dist/index.js";

test("safe href schema accepts supported link forms", () => {
  assert.equal(safeHrefSchema.parse(" /en/contact "), "/en/contact");
  assert.equal(isSafeHref("#faq"), true);
  assert.equal(isSafeHref("https://example.com/signup"), true);
  assert.equal(isSafeHref("mailto:hello@example.com"), true);
  assert.equal(isSafeHref("tel:+15551234567"), true);
});

test("safe href schema rejects control characters and unsafe URL forms", () => {
  assert.equal(isSafeHref("https://example.com\njavascript:alert(1)"), false);
  assert.equal(isSafeHref("https://user:pass@example.com"), false);
  assert.equal(isSafeHref("//evil.example.com"), false);
  assert.equal(isSafeHref("/en/contact onclick=alert(1)"), false);
  assert.equal(isSafeHref("mailto:"), false);
  assert.equal(isSafeHref("tel:"), false);
  assert.throws(() =>
    safeHrefSchema.parse("https://example.com\njavascript:alert(1)"),
  );
});
