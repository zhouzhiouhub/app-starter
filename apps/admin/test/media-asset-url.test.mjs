import assert from "node:assert/strict";
import test from "node:test";
import { readSafeMediaAssetUrl } from "../src/features/media/media-asset-url.ts";

test("media asset URL helper accepts http and https URLs", () => {
  assert.equal(
    readSafeMediaAssetUrl(" https://cdn.example.com/assets/hero.webp "),
    "https://cdn.example.com/assets/hero.webp",
  );
  assert.equal(
    readSafeMediaAssetUrl("http://localhost:4000/uploads/hero.webp?size=thumb"),
    "http://localhost:4000/uploads/hero.webp?size=thumb",
  );
});

test("media asset URL helper rejects unsafe URLs", () => {
  for (const value of [
    "",
    "   ",
    "javascript:alert(1)",
    "data:image/svg+xml,<svg></svg>",
    "file:///tmp/hero.webp",
    "https://user:password@cdn.example.com/hero.webp",
    "/uploads/hero.webp",
  ]) {
    assert.equal(readSafeMediaAssetUrl(value), null);
  }
});
