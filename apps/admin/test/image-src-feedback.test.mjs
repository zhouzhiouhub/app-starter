import assert from "node:assert/strict";
import test from "node:test";
import { readImageSrcFeedback } from "../src/features/pages/image-src-feedback.ts";

test("image source feedback accepts storefront, external, and media images", () => {
  assert.deepEqual(readImageSrcFeedback("/images/gallery.jpg"), {});
  assert.deepEqual(readImageSrcFeedback("https://cdn.example.com/gallery.jpg"), {});
  assert.deepEqual(readImageSrcFeedback("media://asset-1"), {});
});

test("image source feedback warns about blank image rows", () => {
  assert.equal(readImageSrcFeedback("").status, "warning");
  assert.deepEqual(readImageSrcFeedback("", { allowEmpty: true }), {});
});

test("image source feedback rejects unsafe image sources", () => {
  assert.equal(readImageSrcFeedback("javascript:alert(1)").status, "error");
  assert.equal(
    readImageSrcFeedback("data:image/svg+xml,<svg onload=alert(1)>").status,
    "error",
  );
  assert.equal(readImageSrcFeedback("//evil.example.com/image.jpg").status, "error");
  assert.equal(
    readImageSrcFeedback("https://example.com\njavascript:alert(1)").status,
    "error",
  );
  assert.equal(
    readImageSrcFeedback("https://user:pass@example.com/image.jpg").status,
    "error",
  );
});
