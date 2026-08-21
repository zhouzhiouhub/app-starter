import assert from "node:assert/strict";
import test from "node:test";
import {
  assertAllowedExternalMediaUrl,
  assertAllowedMediaUrl,
  parseConfirmMediaInput,
  parseCreateUploadUrlInput,
  readAllowedMediaUrlHosts,
} from "../dist/modules/media/media.validation.js";

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

test("parseConfirmMediaInput rejects reserved metadata fields", () => {
  assert.throws(
    () =>
      parseConfirmMediaInput({
        filename: "hero.webp",
        metadata: {
          altText: "Hero",
          archivedAt: "2026-08-21T00:00:00.000Z",
        },
        mimeType: "image/webp",
        r2Key: "tenant-1/imports/hero.webp",
        size: 4096,
      }),
    /Media metadata field archivedAt is reserved/,
  );
});

test("media URL allowlist includes configured CDN hosts", () => {
  const hosts = readAllowedMediaUrlHosts({
    CDN_BASE_URL: "https://legacy-cdn.example.com/assets",
    MEDIA_CDN_BASE_URL: "https://cdn.example.com/media",
  });

  assert.equal(hosts.has("cdn.example.com"), true);
  assert.equal(hosts.has("legacy-cdn.example.com"), true);
});

test("media URL allowlist ignores unsafe configured CDN hosts", () => {
  const hosts = readAllowedMediaUrlHosts({
    CDN_BASE_URL: "https://legacy-cdn.example.com/assets?token=1",
    MEDIA_CDN_BASE_URL: "https://user:pass@cdn.example.com/media",
  });

  assert.equal(hosts.has("cdn.example.com"), false);
  assert.equal(hosts.has("legacy-cdn.example.com"), false);
  assert.equal(hosts.has("cdn.local.invalid"), true);
});

test("media URL allowlist requires explicit safe managed CDN hosts in production", () => {
  const unsafeHosts = readAllowedMediaUrlHosts({
    CDN_BASE_URL: "https://legacy.brand-platform.com/assets",
    MEDIA_CDN_BASE_URL: "https://cdn.local.invalid/media",
    NODE_ENV: "production",
  });

  assert.equal(unsafeHosts.has("legacy.brand-platform.com"), false);
  assert.equal(unsafeHosts.has("cdn.local.invalid"), false);

  const safeHosts = readAllowedMediaUrlHosts({
    CDN_BASE_URL: "https://legacy.brand-platform.com/assets",
    MEDIA_CDN_BASE_URL: "https://media.brand-platform.com/assets",
    NODE_ENV: "production",
  });

  assert.deepEqual([...safeHosts], ["media.brand-platform.com"]);
});

test("media URL allowlist ignores unsafe external hosts in production", () => {
  const hosts = readAllowedMediaUrlHosts({
    MEDIA_EXTERNAL_URL_HOSTS:
      "localhost, images.local.invalid, https://assets.brand-platform.com",
    NODE_ENV: "production",
  });

  assert.deepEqual([...hosts], ["assets.brand-platform.com"]);
});

test("media URL allowlist accepts explicit external hosts", () => {
  const env = {
    MEDIA_CDN_BASE_URL: "https://cdn.example.com",
    MEDIA_EXTERNAL_URL_HOSTS: "images.example.com, https://assets.example.org",
  };

  assert.doesNotThrow(() =>
    assertAllowedMediaUrl("https://images.example.com/hero.webp", env),
  );
  assert.doesNotThrow(() =>
    assertAllowedMediaUrl("https://assets.example.org/hero.webp", env),
  );
});

test("media URL allowlist rejects unlisted hosts", () => {
  assert.throws(
    () =>
      assertAllowedMediaUrl("https://untrusted.example.net/hero.webp", {
        MEDIA_CDN_BASE_URL: "https://cdn.example.com",
      }),
    {
      name: "BadRequestException",
    },
  );
});

test("external media URL validation only accepts explicit external hosts", () => {
  const env = {
    MEDIA_CDN_BASE_URL: "https://cdn.example.com",
    MEDIA_EXTERNAL_URL_HOSTS: "images.example.com",
  };

  assert.doesNotThrow(() =>
    assertAllowedExternalMediaUrl("https://images.example.com/hero.webp", env),
  );
  assert.throws(
    () =>
      assertAllowedExternalMediaUrl(
        "https://cdn.example.com/tenant-2/hero.webp",
        env,
      ),
    {
      name: "BadRequestException",
    },
  );
  assert.throws(
    () =>
      assertAllowedExternalMediaUrl("http://images.example.com/hero.webp", env),
    /External media URL must use https/,
  );
});

test("media URL allowlist rejects unsafe protocols", () => {
  assert.throws(
    () =>
      assertAllowedMediaUrl("file:///tmp/hero.webp", {
        MEDIA_EXTERNAL_URL_HOSTS: "tmp",
      }),
    {
      name: "BadRequestException",
    },
  );
});

test("media URL allowlist rejects embedded credentials", () => {
  assert.throws(
    () =>
      assertAllowedMediaUrl("https://user:pass@cdn.example.com/hero.webp", {
        MEDIA_CDN_BASE_URL: "https://cdn.example.com",
      }),
    {
      name: "BadRequestException",
    },
  );
});
