import assert from "node:assert/strict";
import test from "node:test";
import { createInitialPageSchema } from "../dist/modules/pages/pages.mapper.js";
import { publishPage } from "../dist/modules/pages/use-cases/publish-page.js";
import {
  createPageActor,
  createPageVersionResult,
} from "./pages-test-helpers.mjs";

test("publishPage triggers storefront revalidation after publishing", async () => {
  const schema = createInitialPageSchema({
    slug: "contact",
    title: "Contact",
  });
  const calls = {
    pageUpdate: null,
    revalidation: null,
  };
  const prisma = {
    $transaction: async (fn) =>
      fn({
        auditLog: {
          create: async () => ({}),
        },
        page: {
          findFirst: async () => ({
            id: "page-1",
            siteId: "site-1",
            slug: "contact",
            versions: [{ id: "version-1", status: "published", version: 2 }],
          }),
          update: async (input) => {
            calls.pageUpdate = input.data;
            return {};
          },
        },
        pageVersion: {
          create: async (input) => createPageVersionResult(input),
        },
      }),
    site: {
      findFirst: async () => ({
        id: "site-1",
        tenantId: "tenant-1",
      }),
    },
  };

  const result = await publishPage(
    prisma,
    "page-1",
    schema,
    undefined,
    createPageActor(),
    async (input) => {
      calls.revalidation = input;
      return {
        paths: ["/en/contact"],
        tags: ["published-page"],
        triggered: true,
      };
    },
  );

  assert.equal(calls.pageUpdate.publishedVersionId, "version-2");
  assert.deepEqual(calls.revalidation, {
    locale: "en-US",
    market: "us",
    slug: "contact",
  });
  assert.equal(result.meta.revalidation.triggered, true);
});
