import assert from "node:assert/strict";
import test from "node:test";
import { createFallbackPage } from "@app-starter/schema";
import {
  createMediaR2Key,
  inferMediaAssetType,
  toMediaAssetResponse,
} from "../dist/modules/media/media.mapper.js";
import { MediaService } from "../dist/modules/media/media.service.js";
import { createMediaUploadTarget } from "../dist/modules/media/media.upload-target.js";
import { parseCreateUploadUrlInput } from "../dist/modules/media/media.validation.js";

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

test("parseCreateUploadUrlInput validates file metadata", () => {
  const parsed = parseCreateUploadUrlInput({
    data: {
      filename: "hero.webp",
      mimeType: "IMAGE/WEBP",
      size: "4096",
    },
  });

  assert.equal(parsed.mimeType, "image/webp");
  assert.equal(parsed.size, 4096);
  assert.throws(() =>
    parseCreateUploadUrlInput({
      filename: "unsafe.exe",
      mimeType: "application/x-msdownload",
      size: 100,
    }),
  );
});

test("createMediaUploadTarget returns R2 presigned PUT URLs when configured", () => {
  const target = createMediaUploadTarget({
    mimeType: "image/webp",
    now: new Date("2026-08-18T00:00:00.000Z"),
    r2Key: "tenant-1/2026/08/18/asset.webp",
    ttlSeconds: 900,
    env: {
      R2_ACCOUNT_ID: "account-1",
      R2_ACCESS_KEY_ID: "access-key",
      R2_BUCKET: "media-bucket",
      R2_SECRET_ACCESS_KEY: "secret-key",
    },
  });
  const url = new URL(target.uploadUrl);

  assert.equal(url.host, "account-1.r2.cloudflarestorage.com");
  assert.equal(url.pathname, "/media-bucket/tenant-1/2026/08/18/asset.webp");
  assert.equal(url.searchParams.get("X-Amz-Algorithm"), "AWS4-HMAC-SHA256");
  assert.equal(url.searchParams.get("X-Amz-Expires"), "900");
  assert.equal(
    url.searchParams.get("X-Amz-Credential"),
    "access-key/20260818/auto/s3/aws4_request",
  );
  assert.match(url.searchParams.get("X-Amz-Signature"), /^[a-f0-9]{64}$/);
  assert.equal(target.uploadUrl.includes("secret-key"), false);
  assert.deepEqual(target.headers, { "Content-Type": "image/webp" });
  assert.equal(target.expiresAt.toISOString(), "2026-08-18T00:15:00.000Z");
});

test("createMediaUploadTarget falls back to configured upload base URLs", () => {
  const target = createMediaUploadTarget({
    mimeType: "image/png",
    now: new Date("2026-08-18T00:00:00.000Z"),
    r2Key: "tenant-1/folder/hero image.png",
    env: {
      MEDIA_UPLOAD_BASE_URL: "https://uploads.example.com/",
    },
  });

  assert.equal(
    target.uploadUrl,
    "https://uploads.example.com/tenant-1/folder/hero%20image.png",
  );
});

test("media service resolves media references in page schemas", async () => {
  const service = new MediaService({
    mediaAsset: {
      findMany(options) {
        assert.deepEqual(options.where, {
          id: { in: ["asset-1"] },
          tenantId: "tenant-1",
        });

        return Promise.resolve([
          {
            id: "asset-1",
            url: "https://cdn.example.com/hero.webp",
          },
        ]);
      },
    },
  });
  const schema = createFallbackPage({ slug: "gallery" });
  const resolved = await service.resolveSchemaMediaReferences(
    {
      ...schema,
      sections: [
        {
          id: "gallery",
          component: "image-gallery",
          props: {
            images: [{ alt: "Hero", src: "media://asset-1" }],
          },
          layout: {},
        },
      ],
      seo: {
        ...schema.seo,
        ogImage: "media://asset-1",
      },
    },
    "tenant-1",
  );

  assert.equal(resolved.seo.ogImage, "https://cdn.example.com/hero.webp");
  assert.equal(
    resolved.sections[0].props.images[0].src,
    "https://cdn.example.com/hero.webp",
  );
});

test("media service archives assets that are not referenced", async () => {
  const createdAt = new Date("2026-08-18T00:00:00.000Z");
  const baseAsset = {
    id: "asset-1",
    tenantId: "tenant-1",
    type: "image",
    filename: "hero.png",
    url: "https://cdn.example.com/hero.png",
    r2Key: "tenant-1/hero.png",
    size: 2048n,
    mimeType: "image/png",
    metadata: {},
    createdAt,
  };
  const service = new MediaService({
    mediaAsset: {
      findFirst(options) {
        assert.deepEqual(options.where, {
          id: "asset-1",
          tenantId: "tenant-1",
        });
        return Promise.resolve(baseAsset);
      },
      update(options) {
        assert.equal(options.where.id, "asset-1");
        assert.equal(typeof options.data.metadata.archivedAt, "string");
        assert.equal(options.data.metadata.archivedBy, "user-1");
        return Promise.resolve({
          ...baseAsset,
          metadata: options.data.metadata,
        });
      },
    },
    pageVersion: {
      findMany() {
        return Promise.resolve([]);
      },
    },
  });

  const result = await service.archive("asset-1", {
    id: "user-1",
    tenantId: "tenant-1",
    email: "admin@example.com",
    name: "Admin",
    scopes: ["media:write"],
  });

  assert.equal(result.data.status, "archived");
  assert.equal(result.data.metadata.archivedBy, "user-1");
});

test("media service blocks archive when page versions reference the asset", async () => {
  const service = new MediaService({
    mediaAsset: {
      findFirst() {
        return Promise.resolve({
          id: "asset-1",
          tenantId: "tenant-1",
          type: "image",
          filename: "hero.png",
          url: "https://cdn.example.com/hero.png",
          r2Key: "tenant-1/hero.png",
          size: 2048n,
          mimeType: "image/png",
          metadata: {},
          createdAt: new Date("2026-08-18T00:00:00.000Z"),
        });
      },
    },
    pageVersion: {
      findMany() {
        return Promise.resolve([
          {
            id: "version-1",
            version: 1,
            status: "draft",
            schema: {
              sections: [
                {
                  props: {
                    images: [{ src: "media://asset-1" }],
                  },
                },
              ],
            },
            page: {
              id: "page-1",
              slug: "home",
              title: "Home",
            },
          },
        ]);
      },
    },
  });

  await assert.rejects(
    () =>
      service.archive("asset-1", {
        id: "user-1",
        tenantId: "tenant-1",
        email: "admin@example.com",
        name: "Admin",
        scopes: ["media:write"],
      }),
    /Media asset is still referenced/,
  );
});
