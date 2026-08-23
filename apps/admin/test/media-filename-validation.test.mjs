import assert from "node:assert/strict";
import test from "node:test";
import {
  MEDIA_FILENAME_MAX_LENGTH,
  readMediaFilenameError,
} from "../src/features/media/media-filename-validation.ts";

test("media filename validation accepts trimmed safe names", () => {
  assert.equal(readMediaFilenameError(" hero.webp "), null);
});

test("media filename validation rejects blank and oversized names", () => {
  assert.match(readMediaFilenameError("   ") ?? "", /filename/);
  assert.match(
    readMediaFilenameError("a".repeat(MEDIA_FILENAME_MAX_LENGTH + 1)) ?? "",
    /255/,
  );
});

test("media filename validation rejects path separators and null bytes", () => {
  for (const value of [
    "nested/hero.webp",
    "nested\\hero.webp",
    "bad\0name.png",
  ]) {
    assert.match(readMediaFilenameError(value) ?? "", /slashes/);
  }
});
