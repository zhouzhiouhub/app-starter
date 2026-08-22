import assert from "node:assert/strict";
import test from "node:test";
import {
  createMediaCdnUrl,
  createMediaUploadTarget,
} from "../dist/modules/media/media.upload-target.js";
import {
  isProductionMediaEnvironment,
} from "../dist/modules/media/media.production-env.js";

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

test("createMediaUploadTarget keeps upload URLs short lived", () => {
  for (const ttlSeconds of [0, 901, 3600, 1.5, Number.POSITIVE_INFINITY]) {
    const target = createMediaUploadTarget({
      mimeType: "image/png",
      now: new Date("2026-08-18T00:00:00.000Z"),
      r2Key: "tenant-1/2026/08/18/asset.png",
      ttlSeconds,
      env: {
        R2_ACCOUNT_ID: "account-1",
        R2_ACCESS_KEY_ID: "access-key",
        R2_BUCKET: "media-bucket",
        R2_SECRET_ACCESS_KEY: "secret-key",
      },
    });
    const url = new URL(target.uploadUrl);

    assert.equal(url.searchParams.get("X-Amz-Expires"), "900");
    assert.equal(target.expiresAt.toISOString(), "2026-08-18T00:15:00.000Z");
  }

  const target = createMediaUploadTarget({
    mimeType: "image/png",
    now: new Date("2026-08-18T00:00:00.000Z"),
    r2Key: "tenant-1/2026/08/18/asset.png",
    ttlSeconds: 60,
    env: {
      R2_ACCOUNT_ID: "account-1",
      R2_ACCESS_KEY_ID: "access-key",
      R2_BUCKET: "media-bucket",
      R2_SECRET_ACCESS_KEY: "secret-key",
    },
  });
  const url = new URL(target.uploadUrl);

  assert.equal(url.searchParams.get("X-Amz-Expires"), "60");
  assert.equal(target.expiresAt.toISOString(), "2026-08-18T00:01:00.000Z");
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

test("createMediaUploadTarget requires R2 configuration in production", () => {
  assert.equal(isProductionMediaEnvironment({ APP_ENV: " production " }), true);
  assert.equal(isProductionMediaEnvironment({ VERCEL_ENV: "production" }), true);
  assert.equal(isProductionMediaEnvironment({ NODE_ENV: "development" }), false);

  assert.throws(
    () =>
      createMediaUploadTarget({
        mimeType: "image/png",
        now: new Date("2026-08-18T00:00:00.000Z"),
        r2Key: "tenant-1/folder/hero.png",
        env: {
          MEDIA_UPLOAD_BASE_URL: "https://uploads.example.com/",
          NODE_ENV: "production",
        },
      }),
    /R2 upload configuration is required in production/,
  );
  assert.throws(
    () =>
      createMediaUploadTarget({
        mimeType: "image/png",
        now: new Date("2026-08-18T00:00:00.000Z"),
        r2Key: "tenant-1/folder/hero.png",
        env: {
          APP_ENV: "production",
          MEDIA_UPLOAD_BASE_URL: "https://uploads.example.com/",
        },
      }),
    /R2 upload configuration is required in production/,
  );
});

test("createMediaUploadTarget rejects unsafe upload base URLs", () => {
  const target = createMediaUploadTarget({
    mimeType: "image/png",
    r2Key: "tenant-1/folder/hero.png",
    env: {
      MEDIA_UPLOAD_BASE_URL: "javascript:alert(1)",
    },
  });

  assert.equal(
    target.uploadUrl,
    "https://uploads.local.invalid/tenant-1/folder/hero.png",
  );
});

test("createMediaCdnUrl requires safe CDN base URLs in production", () => {
  for (const MEDIA_CDN_BASE_URL of [
    "ftp://cdn.brand-platform.com/media",
    "http://cdn.brand-platform.com/media",
    "https://localhost/media",
    "https://cdn.local.invalid/media",
    "https://cdn.example/media",
    "https://cdn.example.com/media",
  ]) {
    assert.throws(
      () =>
        createMediaCdnUrl("tenant-1/folder/hero.png", {
          CDN_BASE_URL: "https://legacy.brand-platform.com/media?token=1",
          MEDIA_CDN_BASE_URL,
          NODE_ENV: "production",
        }),
      /MEDIA_CDN_BASE_URL must be configured as a safe CDN URL in production/,
    );
  }

  assert.throws(
    () =>
      createMediaCdnUrl("tenant-1/folder/hero.png", {
        CDN_BASE_URL: "https://legacy.brand-platform.com/media",
        VERCEL_ENV: "production",
      }),
    /MEDIA_CDN_BASE_URL must be configured as a safe CDN URL in production/,
  );
});

test("createMediaCdnUrl accepts production HTTPS CDN hosts", () => {
  assert.equal(
    createMediaCdnUrl("tenant-1/folder/hero image.png", {
      MEDIA_CDN_BASE_URL: " https://media.brand-platform.com/assets/ ",
      NODE_ENV: "production",
    }),
    "https://media.brand-platform.com/assets/tenant-1/folder/hero%20image.png",
  );
});

test("createMediaCdnUrl ignores legacy CDN base URLs in production", () => {
  assert.throws(
    () =>
      createMediaCdnUrl("tenant-1/folder/hero.png", {
        CDN_BASE_URL: "https://legacy.example.com/media",
        NODE_ENV: "production",
      }),
    /MEDIA_CDN_BASE_URL must be configured as a safe CDN URL in production/,
  );
});

test("createMediaCdnUrl normalizes safe CDN base URLs", () => {
  assert.equal(
    createMediaCdnUrl("tenant-1/folder/hero image.png", {
      MEDIA_CDN_BASE_URL: " https://cdn.example.com/assets/ ",
    }),
    "https://cdn.example.com/assets/tenant-1/folder/hero%20image.png",
  );
});

test("createMediaCdnUrl rejects unsafe CDN base URLs", () => {
  assert.equal(
    createMediaCdnUrl("tenant-1/folder/hero.png", {
      CDN_BASE_URL: "https://legacy.example.com/media/",
      MEDIA_CDN_BASE_URL: "https://user:password@cdn.example.com/media",
    }),
    "https://legacy.example.com/media/tenant-1/folder/hero.png",
  );
  assert.equal(
    createMediaCdnUrl("tenant-1/folder/hero.png", {
      CDN_BASE_URL: "https://legacy.example.com/media?token=1",
      MEDIA_CDN_BASE_URL: "ftp://cdn.example.com/media",
    }),
    "https://cdn.local.invalid/tenant-1/folder/hero.png",
  );
});
