import assert from "node:assert/strict";
import test from "node:test";
import {
  readCtaHrefFeedback,
  readCtaLabelFeedback,
} from "../src/features/pages/cta-feedback.ts";

test("CTA feedback accepts paired safe labels and links", () => {
  assert.deepEqual(readCtaHrefFeedback("Start", "/en/contact"), {});
  assert.deepEqual(readCtaLabelFeedback("Start", "/en/contact"), {});
});

test("CTA feedback warns about incomplete CTA pairs", () => {
  assert.equal(readCtaHrefFeedback("Start", "").status, "warning");
  assert.equal(readCtaLabelFeedback("", "/en/contact").status, "warning");
});

test("CTA feedback rejects unsafe CTA links", () => {
  assert.equal(readCtaHrefFeedback("Start", "javascript:alert(1)").status, "error");
  assert.equal(
    readCtaHrefFeedback("Start", "https://example.com\njavascript:alert(1)").status,
    "error",
  );
});
