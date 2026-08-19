import assert from "node:assert/strict";
import test from "node:test";
import { createFallbackPage } from "@app-starter/schema";
import {
  createPagePreviewToken,
  verifyPagePreviewToken,
} from "../dist/modules/pages/pages.preview-token.js";
import { createPreviewToken } from "../dist/modules/pages/use-cases/create-preview-token.js";
import { getPreviewPageByToken } from "../dist/modules/pages/use-cases/get-preview-page-by-token.js";

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

test("createPreviewToken signs a tenant-scoped page token", async () => {
  await withEnv({ PREVIEW_TOKEN_SECRET: "preview-secret" }, async () => {
    const prisma = {
      page: {
        findFirst(query) {
          assert.deepEqual(query.where, {
            id: "page-1",
            siteId: "site-1",
          });
          assert.deepEqual(query.select, {
            id: true,
            slug: true,
          });
          return Promise.resolve({
            id: "page-1",
            slug: "campaign",
          });
        },
      },
      site: {
        findFirst() {
          return Promise.resolve({
            id: "site-1",
            tenantId: "tenant-1",
          });
        },
      },
    };
    const response = await createPreviewToken(prisma, "page-1", actor());

    assert.equal(response.data.slug, "campaign");
    assert.equal(typeof response.data.token, "string");
    assert.equal(
      verifyPagePreviewToken(response.data.token)?.tenantId,
      "tenant-1",
    );
  });
});

test("getPreviewPageByToken returns the latest draft schema", async () => {
  await withEnv({ PREVIEW_TOKEN_SECRET: "preview-secret" }, async () => {
    const schema = createFallbackPage({
      slug: "campaign",
      title: "Draft Campaign",
    });
    const { token } = createPagePreviewToken({
      pageId: "page-1",
      slug: "campaign",
      tenantId: "tenant-1",
      env: process.env,
    });
    const prisma = {
      page: {
        findFirst(query) {
          assert.deepEqual(query.where, {
            id: "page-1",
            site: {
              tenantId: "tenant-1",
            },
          });
          assert.deepEqual(query.include.versions.orderBy, { version: "desc" });
          assert.equal(query.include.versions.take, 1);

          return Promise.resolve({
            id: "page-1",
            slug: "campaign",
            site: {
              id: "site-1",
              tenantId: "tenant-1",
            },
            versions: [
              {
                id: "version-2",
                schema,
                version: 2,
              },
            ],
          });
        },
      },
    };
    const response = await getPreviewPageByToken(prisma, token);

    assert.equal(response.data.meta.title, "Draft Campaign");
    assert.equal(response.meta.preview, true);
    assert.equal(response.meta.slug, "campaign");
  });
});

function actor() {
  return {
    email: "admin@example.com",
    id: "user-1",
    name: "Admin",
    scopes: ["page:read"],
    tenantId: "tenant-1",
  };
}

async function withEnv(values, fn) {
  const previous = Object.fromEntries(
    Object.keys(values).map((key) => [key, process.env[key]]),
  );

  for (const [key, value] of Object.entries(values)) {
    process.env[key] = value;
  }

  try {
    await fn();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}
