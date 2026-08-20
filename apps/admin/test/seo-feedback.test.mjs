import assert from "node:assert/strict";
import test from "node:test";
import { readSeoFieldFeedback } from "../src/features/pages/seo-feedback.ts";

test("SEO feedback accepts empty optional URL fields", () => {
  assert.deepEqual(readSeoFieldFeedback("canonical", ""), {});
  assert.deepEqual(readSeoFieldFeedback("ogImage", undefined), {});
});

test("SEO feedback validates canonical URLs", () => {
  assert.deepEqual(readSeoFieldFeedback("canonical", "/en/page"), {});
  assert.deepEqual(readSeoFieldFeedback("canonical", "https://example.com/page"), {});
  assert.equal(
    readSeoFieldFeedback("canonical", "javascript:alert(1)").status,
    "error",
  );
  assert.equal(readSeoFieldFeedback("canonical", "media://asset-1").status, "error");
  assert.equal(
    readSeoFieldFeedback(
      "canonical",
      "https://example.com\njavascript:alert(1)",
    ).status,
    "error",
  );
  assert.equal(
    readSeoFieldFeedback("canonical", "https://user:pass@example.com").status,
    "error",
  );
});

test("SEO feedback validates Open Graph image URLs and media references", () => {
  assert.deepEqual(readSeoFieldFeedback("ogImage", "/og.jpg"), {});
  assert.deepEqual(readSeoFieldFeedback("ogImage", "https://cdn.example.com/og.jpg"), {});
  assert.equal(readSeoFieldFeedback("ogImage", "media://asset-1").status, "warning");
  assert.equal(
    readSeoFieldFeedback("ogImage", "http://cdn.example.com/og.jpg").status,
    "error",
  );
  assert.equal(
    readSeoFieldFeedback("ogImage", "javascript:alert(1)").status,
    "error",
  );
  assert.equal(
    readSeoFieldFeedback(
      "ogImage",
      "https://example.com\njavascript:alert(1)",
    ).status,
    "error",
  );
});
