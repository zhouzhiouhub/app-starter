import assert from "node:assert/strict";
import test from "node:test";
import {
  hasSensitiveUrlParameters,
  isSafeHref,
  safeHrefSchema,
} from "../dist/index.js";

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

test("safe href schema rejects sensitive URL parameters", () => {
  for (const href of [
    "/en/contact?token=secret",
    "/en/contact?access%5Ftoken=secret",
    "https://example.com/signup?X-Amz-Signature=signed-value",
    "https://example.com/callback#access_token=fragment-token",
    "#preview_token=fragment-token",
  ]) {
    assert.equal(isSafeHref(href), false, href);
    assert.throws(() => safeHrefSchema.parse(href));
  }
});

test("safe href helper detects sensitive URL parameters", () => {
  assert.equal(hasSensitiveUrlParameters("/en/contact?utm_source=email"), false);
  assert.equal(hasSensitiveUrlParameters("/en/contact?api_key=secret"), true);
  assert.equal(hasSensitiveUrlParameters("#access_token=fragment-token"), true);
  assert.equal(hasSensitiveUrlParameters("/en/contact?access%5Ftoken=secret"), true);
});
