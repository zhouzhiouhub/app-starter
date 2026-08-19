import assert from "node:assert/strict";
import test from "node:test";
import {
  assertAllowedMediaUrl,
  readAllowedMediaUrlHosts,
} from "../dist/modules/media/media.validation.js";

test("media URL allowlist includes configured CDN hosts", () => {
  const hosts = readAllowedMediaUrlHosts({
    CDN_BASE_URL: "https://legacy-cdn.example.com/assets",
    MEDIA_CDN_BASE_URL: "https://cdn.example.com/media",
  });

  assert.equal(hosts.has("cdn.example.com"), true);
  assert.equal(hosts.has("legacy-cdn.example.com"), true);
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
