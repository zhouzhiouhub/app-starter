import assert from "node:assert/strict";
import test from "node:test";
import { listPageVersions } from "../dist/modules/pages/use-cases/list-page-versions.js";

const actor = {
  email: "admin@example.com",
  id: "user-1",
  scopes: ["page:read"],
  tenantId: "tenant-1",
};

test("listPageVersions returns paginated version summaries with authors", async () => {
  const calls = {};
  const prisma = createPrisma(calls);

  const response = await listPageVersions(
    prisma,
    "page-1",
    { limit: "2", page: "2" },
    actor,
    "request-version-list",
  );

  assert.equal(response.meta.requestId, "request-version-list");
  assert.equal(response.meta.pageId, "page-1");
  assert.equal(response.meta.total, 3);
  assert.equal(response.meta.page, 2);
  assert.equal(response.meta.limit, 2);
  assert.equal(calls.pageVersionFindMany.skip, 2);
  assert.equal(calls.pageVersionFindMany.take, 2);
  assert.deepEqual(calls.pageVersionFindMany.orderBy, { version: "desc" });
  assert.deepEqual(calls.authorQuery.where.id.in, ["user-2", "user-1"]);
  assert.deepEqual(
    response.data.map((version) => ({
      authorEmail: version.authorEmail,
      id: version.id,
      version: version.version,
    })),
    [
      {
        authorEmail: "publisher@example.com",
        id: "version-3",
        version: 3,
      },
      {
        authorEmail: "admin@example.com",
        id: "version-2",
        version: 2,
      },
    ],
  );
});

test("listPageVersions rejects pages outside the current tenant site", async () => {
  const prisma = createPrisma({}, { pageExists: false });

  await assert.rejects(
    () =>
      listPageVersions(
        prisma,
        "page-other",
        { limit: "20", page: "1" },
        actor,
        "request-version-missing",
      ),
    /Page not found/,
  );
});

function createPrisma(calls, options = {}) {
  const createdAt = new Date("2026-08-20T00:00:00.000Z");
  const publishedAt = new Date("2026-08-21T00:00:00.000Z");
  const versions = [
    {
      authorId: "user-2",
      createdAt,
      id: "version-3",
      publishedAt,
      status: "published",
      version: 3,
    },
    {
      authorId: "user-1",
      createdAt,
      id: "version-2",
      publishedAt,
      status: "published",
      version: 2,
    },
  ];

  return {
    $transaction: async (input) => Promise.all(input),
    page: {
      findFirst: async (input) => {
        calls.pageFindFirst = input;
        return options.pageExists === false ? null : { id: "page-1" };
      },
    },
    pageVersion: {
      count: async (input) => {
        calls.pageVersionCount = input;
        return 3;
      },
      findMany: async (input) => {
        calls.pageVersionFindMany = input;
        return versions;
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
      findMany: async (input) => {
        calls.authorQuery = input;
        return [
          {
            email: "admin@example.com",
            id: "user-1",
            name: "Admin",
          },
          {
            email: "publisher@example.com",
            id: "user-2",
            name: "Publisher",
          },
        ];
      },
    },
  };
}
