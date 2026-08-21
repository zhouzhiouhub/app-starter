import assert from "node:assert/strict";
import test from "node:test";
import { createFallbackPage } from "@app-starter/schema";
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
