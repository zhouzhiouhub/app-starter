import assert from "node:assert/strict";
import test from "node:test";
import { readSafeHrefFeedback } from "../src/features/pages/safe-href-feedback.ts";

test("safe href feedback accepts storefront and external links", () => {
  assert.deepEqual(readSafeHrefFeedback("/en/contact"), {});
  assert.deepEqual(readSafeHrefFeedback("#faq"), {});
  assert.deepEqual(readSafeHrefFeedback("https://example.com"), {});
  assert.deepEqual(readSafeHrefFeedback("mailto:hello@example.com"), {});
  assert.deepEqual(readSafeHrefFeedback("tel:+15551234567"), {});
});

test("safe href feedback rejects unsafe links", () => {
  assert.equal(readSafeHrefFeedback("javascript:alert(1)").status, "error");
  assert.equal(readSafeHrefFeedback("//evil.example.com").status, "error");
});

test("safe href feedback can allow optional empty links", () => {
  assert.deepEqual(readSafeHrefFeedback("", { allowEmpty: true }), {});
  assert.equal(readSafeHrefFeedback("").status, "error");
});
