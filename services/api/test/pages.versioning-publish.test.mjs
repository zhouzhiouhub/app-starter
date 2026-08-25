import assert from "node:assert/strict";
import test from "node:test";
import { createInitialPageSchema } from "../dist/modules/pages/pages.mapper.js";
import { publishPage } from "../dist/modules/pages/use-cases/publish-page.js";
import { createPublishPrisma } from "./pages-publish-test-helpers.mjs";
import {
  createMemoryIdempotencyRecord,
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
        domain: "store.brand-platform.com",
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
    undefined,
    "request-publish-main",
  );

  assert.equal(calls.pageUpdate.publishedVersionId, "version-2");
  assert.deepEqual(calls.revalidation, {
    fallbackLocale: "en-US",
    fallbackMarket: "us",
    locale: "en-US",
    market: "us",
    requestId: "request-publish-main",
    siteHost: "store.brand-platform.com",
    slug: "contact",
  });
  assert.equal(result.meta.revalidation.triggered, true);
});

test("publishPage reports revalidation failures without failing the publish", async () => {
  const schema = createInitialPageSchema({
    slug: "contact",
    title: "Contact",
  });
  const calls = {};
  const prisma = createPublishPrisma(calls, {
    page: {
      id: "page-1",
      siteId: "site-1",
      slug: "contact",
      versions: [{ id: "version-1", status: "published", version: 2 }],
    },
  });

  const result = await publishPage(
    prisma,
    "page-1",
    schema,
    undefined,
    createPageActor(),
    async () => {
      throw new Error("Unexpected revalidation failure.");
    },
  );

  assert.equal(calls.pageUpdate.publishedVersionId, "version-2");
  assert.equal(result.meta.revalidation.triggered, false);
  assert.equal(result.meta.revalidation.reason, "request-failed");
  assert.deepEqual(result.meta.revalidation.paths, ["/en/contact"]);
  assert.deepEqual(result.meta.revalidation.tags, [
    "published-page",
    "published-page:us:en-US",
    "published-page:us:en-US:contact",
    "public-translation",
    "public-translation:en-US",
  ]);
});

test("publishPage refreshes revalidation on idempotent replay", async () => {
  const schema = createInitialPageSchema({
    slug: "contact",
    title: "Contact",
  });
  const idempotencyCalls = [];
  const calls = {
    versionCreates: 0,
  };
  const prisma = {
    ...createPublishPrisma(calls, {
      onCreateVersion: (input) => {
        calls.versionCreates += 1;
        calls.versionCreate = input.data;
        return createPageVersionResult(input);
      },
      page: {
        id: "page-1",
        siteId: "site-1",
        slug: "contact",
        versions: [{ id: "version-1", status: "published", version: 2 }],
      },
    }),
    idempotencyRecord: createMemoryIdempotencyRecord(idempotencyCalls),
  };
  let revalidationAttempts = 0;
  const revalidationInputs = [];
  const key = "7f10f6d3-02d9-4f3d-a69d-49b26ec63132";
  const revalidator = async (input) => {
    revalidationInputs.push(input);
    revalidationAttempts += 1;

    if (revalidationAttempts === 1) {
      throw new Error("Transient revalidation failure.");
    }

    return {
      paths: ["/en/contact"],
      tags: ["published-page"],
      triggered: true,
    };
  };

  const first = await publishPage(
    prisma,
    "page-1",
    schema,
    key,
    createPageActor(),
    revalidator,
    undefined,
    "request-publish-first",
  );
  const second = await publishPage(
    prisma,
    "page-1",
    schema,
    key,
    createPageActor(),
    revalidator,
    undefined,
    "request-publish-retry",
  );

  assert.equal(first.meta.revalidation.triggered, false);
  assert.equal(second.meta.requestId, "request-publish-retry");
  assert.equal(second.meta.revalidation.triggered, true);
  assert.equal(calls.versionCreates, 1);
  assert.equal(revalidationAttempts, 2);
  assert.equal(revalidationInputs[0].requestId, "request-publish-first");
  assert.equal(revalidationInputs[1].requestId, "request-publish-retry");
  assert.deepEqual(idempotencyCalls, [
    ["findUnique", "pages:page-1:publish"],
    ["create", "pages:page-1:publish"],
    ["update", "completed"],
    ["findUnique", "pages:page-1:publish"],
  ]);
});
