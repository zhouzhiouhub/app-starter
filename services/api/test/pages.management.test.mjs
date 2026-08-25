import assert from "node:assert/strict";
import test from "node:test";
import { createInitialPageSchema } from "../dist/modules/pages/pages.mapper.js";
import { createPage } from "../dist/modules/pages/use-cases/create-page.js";
import { getPageById } from "../dist/modules/pages/use-cases/get-page-by-id.js";
import { listPages } from "../dist/modules/pages/use-cases/list-pages.js";
import { savePageDraft } from "../dist/modules/pages/use-cases/save-page-draft.js";

const actor = {
  email: "admin@example.com",
  id: "user-1",
  scopes: ["page:read", "page:write"],
  tenantId: "tenant-1",
};
const createdAt = new Date("2026-08-20T00:00:00.000Z");

test("page management use cases carry the current request id", async () => {
  const schema = createInitialPageSchema({
    slug: "campaign",
    title: "Campaign",
  });
  const prisma = createPrisma();

  const created = await createPage(
    prisma,
    { slug: "campaign", title: "Campaign" },
    undefined,
    actor,
    "request-page-create",
  );
  const listed = await listPages(
    prisma,
    { limit: "20", page: "1" },
    actor,
    "request-page-list",
  );
  const detail = await getPageById(
    prisma,
    "page-1",
    actor,
    "request-page-detail",
  );
  const saved = await savePageDraft(
    prisma,
    "page-1",
    schema,
    undefined,
    actor,
    "request-page-save",
  );

  assert.equal(created.meta.requestId, "request-page-create");
  assert.equal(listed.meta.requestId, "request-page-list");
  assert.equal(listed.data[0].locale, "en-US");
  assert.equal(detail.meta.requestId, "request-page-detail");
  assert.equal(saved.meta.requestId, "request-page-save");
});

test("page detail loads only the latest and published versions", async () => {
  const calls = {};
  const latestSchema = createInitialPageSchema({
    slug: "campaign",
    title: "Campaign draft",
  });
  const publishedSchema = createInitialPageSchema({
    slug: "campaign",
    title: "Campaign published",
  });
  const prisma = createVersionedPrisma(calls, {
    latestSchema,
    publishedSchema,
  });

  const detail = await getPageById(
    prisma,
    "page-1",
    actor,
    "request-page-detail-versions",
  );

  assert.equal(calls.pageFindFirst.include.versions.take, 1);
  assert.deepEqual(calls.publishedVersionFindFirst.where, {
    id: "version-published",
    pageId: "page-1",
  });
  assert.deepEqual(
    detail.data.versions.map((version) => version.id),
    ["version-draft", "version-published"],
  );
  assert.equal(detail.data.draftSchema.meta.title, "Campaign draft");
  assert.equal(detail.data.publishedSchema.meta.title, "Campaign published");
});

function createPrisma() {
  const page = {
    createdAt,
    id: "page-1",
    publishedVersionId: null,
    siteId: "site-1",
    slug: "campaign",
    status: "draft",
    title: "Campaign",
    type: "landing",
    updatedAt: createdAt,
  };

  return {
    $transaction: async (input) =>
      typeof input === "function"
        ? input(createTransaction(page))
        : Promise.all(input),
    page: {
      count: async () => 1,
      create: async () => page,
      findFirst: async () => ({
        ...page,
        versions: [],
      }),
      findMany: async () => [page],
    },
    pageVersion: {
      findFirst: async () => {
        throw new Error("listPages should batch latest version lookup.");
      },
      findMany: async (input) =>
        input.where.OR
          ? [
              {
                id: "version-1",
                pageId: page.id,
                schema: createInitialPageSchema({
                  slug: "campaign",
                  title: "Campaign",
                }),
              },
            ]
          : [],
      groupBy: async () => [
        {
          _max: {
            version: 1,
          },
          pageId: page.id,
        },
      ],
    },
    site: {
      findFirst: async () => ({
        id: "site-1",
        tenantId: "tenant-1",
      }),
    },
  };
}

function createTransaction(page) {
  return {
    page: {
      findFirst: async () => ({
        ...page,
        versions: [],
      }),
      update: async (input) => ({
        ...page,
        title: input.data.title,
      }),
    },
    pageVersion: {
      create: async (input) => ({
        ...input.data,
        id: "version-1",
      }),
    },
  };
}

function createVersionedPrisma(calls, input) {
  const page = {
    createdAt,
    id: "page-1",
    publishedVersionId: "version-published",
    siteId: "site-1",
    slug: "campaign",
    status: "published",
    title: "Campaign",
    type: "landing",
    updatedAt: createdAt,
  };
  const latest = createVersion({
    id: "version-draft",
    publishedAt: null,
    schema: input.latestSchema,
    status: "draft",
    version: 5,
  });
  const published = createVersion({
    id: "version-published",
    schema: input.publishedSchema,
    status: "published",
    version: 4,
  });

  return {
    page: {
      findFirst: async (query) => {
        calls.pageFindFirst = query;
        return {
          ...page,
          versions: [latest],
        };
      },
    },
    pageVersion: {
      findFirst: async (query) => {
        calls.publishedVersionFindFirst = query;
        return published;
      },
    },
    site: {
      findFirst: async () => ({
        domain: "localhost",
        id: "site-1",
        tenantId: "tenant-1",
      }),
    },
    user: {
      findMany: async () => [
        {
          email: "admin@example.com",
          id: "user-1",
          name: "Admin",
        },
      ],
    },
  };
}

function createVersion(overrides) {
  return {
    authorId: "user-1",
    createdAt,
    id: "version-1",
    publishedAt: createdAt,
    status: "published",
    version: 1,
    ...overrides,
  };
}
