import assert from "node:assert/strict";
import test from "node:test";
import { readExternalMediaUrlError } from "../src/features/media/external-media-url-validation.ts";

test("external media URL validation accepts https URLs", () => {
  assert.equal(readExternalMediaUrlError("https://cdn.example.com/hero.webp"), null);
});

test("external media URL validation rejects invalid protocols", () => {
  assert.match(readExternalMediaUrlError("http://cdn.example.com/hero.webp") ?? "", /https/);
  assert.match(readExternalMediaUrlError("file:///tmp/hero.webp") ?? "", /https/);
  assert.match(readExternalMediaUrlError("javascript:alert(1)") ?? "", /https/);
});

test("external media URL validation rejects embedded credentials", () => {
  assert.match(
    readExternalMediaUrlError("https://user:pass@cdn.example.com/hero.webp") ?? "",
    /username or password/,
  );
});
