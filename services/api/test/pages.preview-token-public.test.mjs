import assert from "node:assert/strict";
import test from "node:test";
import { apiErrorCodes, createFallbackPage } from "@app-starter/schema";
import { createPagePreviewToken } from "../dist/modules/pages/pages.preview-token.js";
import { getPreviewPageByToken } from "../dist/modules/pages/use-cases/get-preview-page-by-token.js";
import { withEnv } from "./env-helper.mjs";

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
    const response = await getPreviewPageByToken(
      prisma,
      token,
      "request-public-preview",
    );

    assert.equal(response.data.meta.title, "Draft Campaign");
    assert.equal(response.meta.requestId, "request-public-preview");
    assert.equal(response.meta.preview, true);
    assert.equal(response.meta.slug, "campaign");
  });
});

test("getPreviewPageByToken restricts previews to the requested site", async () => {
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
            siteId: "site-1",
            site: {
              tenantId: "tenant-1",
            },
          });

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
      site: {
        findUnique(query) {
          assert.deepEqual(query.where, {
            domain: "store.brand-platform.com",
          });

          return Promise.resolve({
            id: "site-1",
            domain: "store.brand-platform.com",
            tenantId: "tenant-1",
          });
        },
      },
    };
    const response = await getPreviewPageByToken(
      prisma,
      token,
      "request-public-preview",
      undefined,
      {
        siteHost: "store.brand-platform.com",
      },
    );

    assert.equal(response.data.meta.title, "Draft Campaign");
    assert.equal(response.meta.siteId, "site-1");
  });
});

test("getPreviewPageByToken rejects previews for missing public sites", async () => {
  await withEnv({ PREVIEW_TOKEN_SECRET: "preview-secret" }, async () => {
    const { token } = createPagePreviewToken({
      pageId: "page-1",
      slug: "campaign",
      tenantId: "tenant-1",
      env: process.env,
    });
    const prisma = {
      page: {
        findFirst() {
          throw new Error("page should not be queried for a missing site");
        },
      },
      site: {
        findFirst() {
          throw new Error("default site should not be queried for public host");
        },
        findUnique(query) {
          assert.deepEqual(query.where, {
            domain: "missing.brand-platform.com",
          });

          return Promise.resolve(null);
        },
      },
    };

    await assert.rejects(
      () =>
        getPreviewPageByToken(
          prisma,
          token,
          "request-public-preview",
          undefined,
          {
            siteHost: "missing.brand-platform.com",
          },
        ),
      /Preview token is invalid or expired/,
    );
  });
});

test("getPreviewPageByToken rejects tokens whose slug no longer matches", async () => {
  await withEnv({ PREVIEW_TOKEN_SECRET: "preview-secret" }, async () => {
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

          return Promise.resolve({
            id: "page-1",
            slug: "renamed-campaign",
            site: {
              id: "site-1",
              tenantId: "tenant-1",
            },
            versions: [
              {
                id: "version-2",
                schema: createFallbackPage({ slug: "renamed-campaign" }),
                version: 2,
              },
            ],
          });
        },
      },
    };

    await assert.rejects(
      () => getPreviewPageByToken(prisma, token),
      /Preview token is invalid or expired/,
    );
  });
});

test("getPreviewPageByToken rejects corrupt latest draft schemas", async () => {
  await withEnv({ PREVIEW_TOKEN_SECRET: "preview-secret" }, async () => {
    const { token } = createPagePreviewToken({
      pageId: "page-1",
      slug: "campaign",
      tenantId: "tenant-1",
      env: process.env,
    });
    const prisma = {
      page: {
        findFirst() {
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
                schema: {
                  meta: {
                    slug: "campaign",
                  },
                },
                version: 2,
              },
            ],
          });
        },
      },
    };

    await assert.rejects(
      () => getPreviewPageByToken(prisma, token),
      (error) =>
        typeof error.getStatus === "function" &&
        error.getStatus() === 404 &&
        error.getResponse()?.code === apiErrorCodes.NOT_FOUND &&
        error.getResponse()?.message ===
          "Preview token is invalid or expired.",
    );
  });
});

test("getPreviewPageByToken rejects malformed tokens before database lookup", async () => {
  const prisma = {
    page: {
      findFirst() {
        throw new Error("database should not be queried");
      },
    },
  };

  await assert.rejects(
    () => getPreviewPageByToken(prisma, "not a preview token"),
    /Preview token is invalid or expired/,
  );
});
