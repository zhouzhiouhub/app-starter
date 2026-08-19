import assert from "node:assert/strict";
import test from "node:test";
import { listPublishedPages } from "../dist/modules/pages/use-cases/list-published-pages.js";

test("listPublishedPages returns public summaries for published pages", async () => {
  const updatedAt = new Date("2026-08-19T00:00:00.000Z");
  const publishedAt = new Date("2026-08-19T00:01:00.000Z");
  const prisma = {
    page: {
      findMany: async (query) => {
        assert.deepEqual(query.where, {
          siteId: "site-1",
          publishedVersionId: { not: null },
        });
        assert.deepEqual(query.orderBy, { slug: "asc" });

        return [
          {
            publishedVersionId: "version-1",
            slug: "home",
            title: "Home",
            updatedAt,
            versions: [
              {
                id: "version-1",
                publishedAt,
              },
            ],
          },
          {
            publishedVersionId: "version-3",
            slug: "legal/terms",
            title: "Terms",
            updatedAt,
            versions: [
              {
                id: "version-2",
                publishedAt: new Date("2026-08-18T00:00:00.000Z"),
              },
              {
                id: "version-3",
                publishedAt: null,
              },
            ],
          },
          {
            publishedVersionId: "missing-version",
            slug: "broken-page",
            title: "Broken",
            updatedAt,
            versions: [],
          },
        ];
      },
    },
    site: {
      findUnique: async () => ({
        id: "site-1",
        tenantId: "tenant-1",
      }),
    },
  };

  const result = await listPublishedPages(prisma);

  assert.deepEqual(result.data, [
    {
      slug: "home",
      title: "Home",
      publishedAt: "2026-08-19T00:01:00.000Z",
      updatedAt: "2026-08-19T00:00:00.000Z",
    },
    {
      slug: "legal/terms",
      title: "Terms",
      publishedAt: null,
      updatedAt: "2026-08-19T00:00:00.000Z",
    },
  ]);
  assert.equal(result.meta.total, 2);
  assert.equal(result.meta.tenantId, "tenant-1");
});
