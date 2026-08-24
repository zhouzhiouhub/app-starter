import assert from "node:assert/strict";
import test from "node:test";
import {
  publicTranslationEntryMaxCount,
  publicTranslationKeyMaxLength,
  publicTranslationMessageMaxLength,
  translationEntryMaxCount,
} from "../dist/index.js";

test("public translation limits keep bounded positive values", () => {
  assert.equal(translationEntryMaxCount, 2_000);
  assert.equal(publicTranslationEntryMaxCount, 2_000);
  assert.equal(publicTranslationKeyMaxLength, 256);
  assert.equal(publicTranslationMessageMaxLength, 20_000);
});
