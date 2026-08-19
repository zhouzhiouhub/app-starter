import assert from "node:assert/strict";
import test from "node:test";
import { readExternalMediaUrlError } from "../src/features/media/external-media-url-validation.ts";

test("external media URL validation accepts http and https URLs", () => {
  assert.equal(readExternalMediaUrlError("https://cdn.example.com/hero.webp"), null);
  assert.equal(readExternalMediaUrlError("http://cdn.example.com/hero.webp"), null);
});

test("external media URL validation rejects invalid protocols", () => {
  assert.match(readExternalMediaUrlError("file:///tmp/hero.webp") ?? "", /http/);
  assert.match(readExternalMediaUrlError("javascript:alert(1)") ?? "", /http/);
});

test("external media URL validation rejects embedded credentials", () => {
  assert.match(
    readExternalMediaUrlError("https://user:pass@cdn.example.com/hero.webp") ?? "",
    /username or password/,
  );
});
