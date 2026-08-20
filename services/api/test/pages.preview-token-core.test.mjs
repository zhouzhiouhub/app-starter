import assert from "node:assert/strict";
import test from "node:test";
import {
  createPagePreviewToken,
  verifyPagePreviewToken,
} from "../dist/modules/pages/pages.preview-token.js";

test("preview tokens verify, expire, and reject tampering", () => {
  const env = {
    PREVIEW_TOKEN_SECRET: "preview-secret",
    PREVIEW_TOKEN_TTL_SECONDS: "60",
  };
  const now = new Date("2026-08-19T00:00:00.000Z");
  const { expiresAt, token } = createPagePreviewToken({
    env,
    now,
    pageId: "page-1",
    slug: "campaign",
    tenantId: "tenant-1",
  });

  assert.equal(expiresAt.toISOString(), "2026-08-19T00:01:00.000Z");
  assert.equal(
    verifyPagePreviewToken(token, {
      env,
      now: new Date("2026-08-19T00:00:30.000Z"),
    })?.pageId,
    "page-1",
  );
  assert.equal(
    verifyPagePreviewToken(`${token.slice(0, -1)}x`, { env, now }),
    null,
  );
  assert.equal(
    verifyPagePreviewToken(token, {
      env,
      now: new Date("2026-08-19T00:01:01.000Z"),
    }),
    null,
  );
});

test("preview token verification rejects malformed token shapes early", () => {
  const productionEnv = {
    NODE_ENV: "production",
    PREVIEW_TOKEN_SECRET: "",
  };

  for (const token of [
    "",
    "payload.signature.extra",
    "payload.signature!",
    `payload.${"a".repeat(42)}`,
    `${"a".repeat(2049)}.${"b".repeat(43)}`,
  ]) {
    assert.equal(verifyPagePreviewToken(token, { env: productionEnv }), null);
  }
});

test("preview token TTL stays within the one hour preview window", () => {
  const now = new Date("2026-08-19T00:00:00.000Z");

  assert.equal(
    createPagePreviewToken({
      env: {
        PREVIEW_TOKEN_SECRET: "preview-secret",
        PREVIEW_TOKEN_TTL_SECONDS: "1",
      },
      now,
      pageId: "page-1",
      slug: "campaign",
      tenantId: "tenant-1",
    }).expiresAt.toISOString(),
    "2026-08-19T00:00:01.000Z",
  );

  for (const value of ["0", "-1", "3600.5", "86400", "Infinity", "soon"]) {
    assert.equal(
      createPagePreviewToken({
        env: {
          PREVIEW_TOKEN_SECRET: "preview-secret",
          PREVIEW_TOKEN_TTL_SECONDS: value,
        },
        now,
        pageId: "page-1",
        slug: "campaign",
        tenantId: "tenant-1",
      }).expiresAt.toISOString(),
      "2026-08-19T01:00:00.000Z",
    );
  }
});

test("preview token verification accepts the previous secret during rotation", () => {
  const now = new Date("2026-08-19T00:00:00.000Z");
  const oldEnv = {
    PREVIEW_TOKEN_SECRET: "old-preview-secret",
    PREVIEW_TOKEN_TTL_SECONDS: "60",
  };
  const rotatedEnv = {
    PREVIEW_TOKEN_PREVIOUS_SECRET: "old-preview-secret",
    PREVIEW_TOKEN_SECRET: "new-preview-secret",
    PREVIEW_TOKEN_TTL_SECONDS: "60",
  };
  const oldToken = createPagePreviewToken({
    env: oldEnv,
    now,
    pageId: "page-1",
    slug: "campaign",
    tenantId: "tenant-1",
  }).token;
  const newToken = createPagePreviewToken({
    env: rotatedEnv,
    now,
    pageId: "page-1",
    slug: "campaign",
    tenantId: "tenant-1",
  }).token;

  assert.equal(
    verifyPagePreviewToken(oldToken, { env: rotatedEnv, now })?.tenantId,
    "tenant-1",
  );
  assert.equal(verifyPagePreviewToken(newToken, { env: oldEnv, now }), null);
  assert.equal(
    verifyPagePreviewToken(newToken, { env: rotatedEnv, now })?.tenantId,
    "tenant-1",
  );
});
