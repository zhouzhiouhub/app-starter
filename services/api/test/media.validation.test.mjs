import assert from "node:assert/strict";
import test from "node:test";
import {
  assertAllowedExternalMediaUrl,
  assertAllowedMediaUrl,
  parseConfirmMediaInput,
  parseCreateUploadUrlInput,
  readAllowedMediaUrlHosts,
  readExternalMediaUrlHosts,
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
    MEDIA_CDN_BASE_URL: "https://cdn.example/media",
    NODE_ENV: "production",
  });

  assert.equal(unsafeHosts.has("legacy.brand-platform.com"), false);
  assert.equal(unsafeHosts.has("cdn.example"), false);

  const safeHosts = readAllowedMediaUrlHosts({
    CDN_BASE_URL: "https://legacy.brand-platform.com/assets",
    MEDIA_CDN_BASE_URL: "https://media.brand-platform.com/assets",
    NODE_ENV: "production",
  });

  assert.deepEqual([...safeHosts], ["media.brand-platform.com"]);
});

test("media URL allowlist treats deployment production markers as production", () => {
  const managedHosts = readAllowedMediaUrlHosts({
    APP_ENV: "production",
    CDN_BASE_URL: "https://legacy.brand-platform.com/assets",
    MEDIA_CDN_BASE_URL: "https://media.brand-platform.com/assets",
  });

  assert.deepEqual([...managedHosts], ["media.brand-platform.com"]);

  const externalHosts = readAllowedMediaUrlHosts({
    MEDIA_EXTERNAL_URL_HOSTS:
      "localhost, https://assets.example, https://assets.brand-platform.com",
    VERCEL_ENV: "production",
  });

  assert.deepEqual([...externalHosts], ["assets.brand-platform.com"]);
});

test("media URL allowlist ignores unsafe external hosts in production", () => {
  const hosts = readAllowedMediaUrlHosts({
    MEDIA_EXTERNAL_URL_HOSTS:
      "localhost, images.local.invalid, https://assets.example, https://assets.brand-platform.com",
    NODE_ENV: "production",
  });

  assert.deepEqual([...hosts], ["assets.brand-platform.com"]);
});

test("external media allowlist ignores URL parts and non-HTTPS origins", () => {
  const hosts = readExternalMediaUrlHosts({
    MEDIA_EXTERNAL_URL_HOSTS:
      "images.brand-platform.com, http://assets.brand-platform.com, https://assets.brand-platform.com/path, https://user:secret@private.brand-platform.com, https://query.brand-platform.com?token=1",
  });

  assert.deepEqual([...hosts], ["images.brand-platform.com"]);
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

test("media URL allowlist enforces managed CDN source prefixes", () => {
  const env = {
    MEDIA_CDN_BASE_URL: "https://media.brand-platform.com/assets",
    MEDIA_EXTERNAL_URL_HOSTS: "images.brand-platform.com",
  };

  assert.doesNotThrow(() =>
    assertAllowedMediaUrl(
      "https://media.brand-platform.com/assets/tenant-1/hero.webp",
      env,
    ),
  );
  assert.doesNotThrow(() =>
    assertAllowedMediaUrl(
      "https://images.brand-platform.com/private/hero.webp",
      env,
    ),
  );
  assert.throws(
    () =>
      assertAllowedMediaUrl(
        "https://media.brand-platform.com/private/hero.webp",
        env,
      ),
    {
      name: "BadRequestException",
    },
  );
  assert.throws(
    () =>
      assertAllowedMediaUrl(
        "http://media.brand-platform.com/assets/tenant-1/hero.webp",
        env,
      ),
    {
      name: "BadRequestException",
    },
  );
});

test("media URL allowlist keeps root managed CDN sources broad", () => {
  assert.doesNotThrow(() =>
    assertAllowedMediaUrl("https://cdn.example.com/hero.webp", {
      MEDIA_CDN_BASE_URL: "https://cdn.example.com",
    }),
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

test("media URL allowlist rejects fragments and sensitive query parameters", () => {
  const env = {
    MEDIA_CDN_BASE_URL: "https://cdn.example.com",
    MEDIA_EXTERNAL_URL_HOSTS: "images.example.com",
  };

  assert.doesNotThrow(() =>
    assertAllowedMediaUrl("https://cdn.example.com/hero.webp?v=2", env),
  );
  assert.doesNotThrow(() =>
    assertAllowedExternalMediaUrl(
      "https://images.example.com/hero.webp?width=1200",
      env,
    ),
  );
  assert.throws(
    () => assertAllowedMediaUrl("https://cdn.example.com/hero.webp#token", env),
    /Media URL must not include fragments/,
  );
  assert.throws(
    () =>
      assertAllowedExternalMediaUrl(
        "https://images.example.com/hero.webp?X-Amz-Signature=signed",
        env,
      ),
    /credential or token/,
  );
  assert.throws(
    () =>
      assertAllowedExternalMediaUrl(
        "https://images.example.com/hero.webp?Policy=signed-policy",
        env,
      ),
    /credential or token/,
  );
  assert.throws(
    () =>
      assertAllowedExternalMediaUrl(
        "https://images.example.com/hero.webp?authorization_code=oauth-code",
        env,
      ),
    /credential or token/,
  );
  assert.throws(
    () =>
      assertAllowedExternalMediaUrl(
        "https://images.example.com/hero.webp?code_verifier=pkce-secret",
        env,
      ),
    /credential or token/,
  );
  assert.throws(
    () =>
      assertAllowedMediaUrl(
        "https://cdn.example.com/hero.webp#oauth_verifier=oauth-secret",
        env,
      ),
    /fragments/,
  );
});
