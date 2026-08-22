import assert from "node:assert/strict";
import test from "node:test";
import { readImageAltFeedback } from "../src/features/pages/image-alt-feedback.ts";

test("image alt feedback accepts descriptive alt text", () => {
  assert.deepEqual(readImageAltFeedback("Lifestyle product photo"), {});
});

test("image alt feedback warns about blank alt text", () => {
  assert.equal(readImageAltFeedback("").status, "warning");
  assert.equal(readImageAltFeedback("   ").status, "warning");
  assert.deepEqual(readImageAltFeedback("", { allowEmpty: true }), {});
});
