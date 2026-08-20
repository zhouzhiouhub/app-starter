import assert from "node:assert/strict";
import test from "node:test";
import { getPublishedPageBySlug } from "../dist/modules/pages/use-cases/get-published-page-by-slug.js";
import { listPublishedPages } from "../dist/modules/pages/use-cases/list-published-pages.js";

function createSchema(
  slug,
  title,
  options = { locale: "en-US", market: "us", noIndex: false },
) {
  return {
    version: "1.0",
    meta: {
      slug,
      title,
      market: options.market ?? "us",
      locale: options.locale ?? "en-US",
    },
    layout: {
      desktop: {},
      mobile: {},
    },
    sections: [],
    seo: {
      description: "",
      noIndex: options.noIndex ?? false,
      title,
    },
  };
}

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
                schema: createSchema("home", "Home"),
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
                schema: createSchema("legal/terms", "Terms"),
              },
              {
                id: "version-3",
                publishedAt: null,
                schema: createSchema("legal/terms", "Terms", {
                  noIndex: true,
                }),
              },
            ],
          },
          {
            publishedVersionId: "version-4",
            slug: "de-kampagne",
            title: "German Campaign",
            updatedAt,
            versions: [
              {
                id: "version-4",
                publishedAt,
                schema: createSchema("de-kampagne", "German Campaign", {
                  locale: "de-DE",
                }),
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

  const result = await listPublishedPages(
    prisma,
    {
      locale: "en-US",
      market: "us",
    },
    "request-public-list",
  );

  assert.deepEqual(result.data, [
    {
      noIndex: false,
      slug: "home",
      title: "Home",
      publishedAt: "2026-08-19T00:01:00.000Z",
      updatedAt: "2026-08-19T00:00:00.000Z",
    },
    {
      noIndex: true,
      slug: "legal/terms",
      title: "Terms",
      publishedAt: null,
      updatedAt: "2026-08-19T00:00:00.000Z",
    },
  ]);
  assert.equal(result.meta.total, 2);
  assert.equal(result.meta.tenantId, "tenant-1");
  assert.equal(result.meta.requestId, "request-public-list");
});

test("listPublishedPages filters summaries by published locale and market", async () => {
  const updatedAt = new Date("2026-08-19T00:00:00.000Z");
  const publishedAt = new Date("2026-08-19T00:01:00.000Z");
  const prisma = {
    page: {
      findMany: async () => [
        {
          publishedVersionId: "version-1",
          slug: "home",
          title: "Home",
          updatedAt,
          versions: [
            {
              id: "version-1",
              publishedAt,
              schema: createSchema("home", "Home"),
            },
          ],
        },
        {
          publishedVersionId: "version-2",
          slug: "kampagne",
          title: "Kampagne",
          updatedAt,
          versions: [
            {
              id: "version-2",
              publishedAt,
              schema: createSchema("kampagne", "Kampagne", {
                locale: "de-DE",
              }),
            },
          ],
        },
      ],
    },
    site: {
      findUnique: async () => ({
        id: "site-1",
        tenantId: "tenant-1",
      }),
    },
  };

  const result = await listPublishedPages(prisma, {
    locale: "de-DE",
    market: "us",
  });

  assert.deepEqual(result.data.map((page) => page.slug), ["kampagne"]);
  assert.equal(result.meta.total, 1);
});

test("getPublishedPageBySlug returns null when published schema context mismatches", async () => {
  const prisma = {
    page: {
      findUnique: async (query) => {
        assert.deepEqual(query.where, {
          siteId_slug: {
            siteId: "site-1",
            slug: "home",
          },
        });

        return {
          publishedVersionId: "version-1",
          slug: "home",
          versions: [
            {
              id: "version-1",
              schema: createSchema("home", "Home"),
            },
          ],
        };
      },
    },
    site: {
      findUnique: async () => ({
        id: "site-1",
        tenantId: "tenant-1",
      }),
    },
  };

  const result = await getPublishedPageBySlug(prisma, "home", {
    locale: "de-DE",
    market: "us",
  });

  assert.equal(result, null);
});
