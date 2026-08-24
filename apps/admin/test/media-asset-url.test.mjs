import assert from "node:assert/strict";
import test from "node:test";
import { readSafeMediaAssetUrl } from "../src/features/media/media-asset-url.ts";

test("media asset URL helper accepts HTTPS and local HTTP URLs", () => {
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
    "http://cdn.example.com/hero.webp",
    "javascript:alert(1)",
    "data:image/svg+xml,<svg></svg>",
    "file:///tmp/hero.webp",
    "https://user:password@cdn.example.com/hero.webp",
    "https://cdn.example.com/hero.webp?token=secret",
    "https://cdn.example.com/hero.webp?X-Amz-Signature=signed-value",
    "https://cdn.example.com/hero.webp#access_token=secret",
    "https://cdn.example.com/hero.webp\njavascript:alert(1)",
    "/uploads/hero.webp",
  ]) {
    assert.equal(readSafeMediaAssetUrl(value), null);
  }
});
