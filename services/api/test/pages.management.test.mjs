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
