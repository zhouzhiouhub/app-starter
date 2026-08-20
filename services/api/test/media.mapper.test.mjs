import assert from "node:assert/strict";
import test from "node:test";
import {
  createMediaR2Key,
  inferMediaAssetType,
  toMediaAssetResponse,
} from "../dist/modules/media/media.mapper.js";

test("inferMediaAssetType maps allowed media types", () => {
  assert.equal(inferMediaAssetType("image/webp"), "image");
  assert.equal(inferMediaAssetType("video/mp4"), "video");
  assert.equal(inferMediaAssetType("application/pdf"), "pdf");
  assert.equal(inferMediaAssetType("application/octet-stream"), "other");
});

test("createMediaR2Key scopes and sanitizes object keys", () => {
  const key = createMediaR2Key({
    filename: "hero image/final.png",
    now: new Date("2026-08-18T00:00:00.000Z"),
    tenantId: "tenant-1",
  });

  assert.match(
    key,
    /^tenant-1\/2026\/08\/18\/[a-f0-9-]+-hero-image-final.png$/,
  );
  assert.equal(key.includes(" "), false);
});

test("toMediaAssetResponse serializes asset references", () => {
  const response = toMediaAssetResponse({
    id: "asset-1",
    type: "image",
    filename: "hero.png",
    url: "https://cdn.example.com/hero.png",
    r2Key: "tenant-1/2026/08/18/asset-1-hero.png",
    size: 2048n,
    mimeType: "image/png",
    metadata: { altText: "Hero" },
    createdAt: new Date("2026-08-18T00:00:00.000Z"),
  });

  assert.equal(response.reference, "media://asset-1");
  assert.equal(response.status, "active");
  assert.equal(response.archivedAt, null);
  assert.equal(response.size, 2048);
  assert.deepEqual(response.metadata, { altText: "Hero" });
});

test("toMediaAssetResponse marks archived assets from metadata", () => {
  const response = toMediaAssetResponse({
    id: "asset-1",
    type: "image",
    filename: "hero.png",
    url: "https://cdn.example.com/hero.png",
    r2Key: "tenant-1/2026/08/18/asset-1-hero.png",
    size: 2048n,
    mimeType: "image/png",
    metadata: { archivedAt: "2026-08-18T00:00:00.000Z" },
    createdAt: new Date("2026-08-18T00:00:00.000Z"),
  });

  assert.equal(response.status, "archived");
  assert.equal(response.archivedAt, "2026-08-18T00:00:00.000Z");
});
