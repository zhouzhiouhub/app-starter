import assert from "node:assert/strict";
import test from "node:test";
import { publicPublishedPageListMaxCount } from "../../../packages/schema/dist/index.js";
import { listPublishedPages } from "../dist/modules/pages/use-cases/list-published-pages.js";
import {
  createPublicPageSchema,
  createPublicSite,
} from "./pages-public-test-helpers.mjs";

test("listPublishedPages returns public summaries for published pages", async () => {
  const publishedAt = new Date("2026-08-19T00:01:00.000Z");
  const versionCreatedAt = new Date("2026-08-19T00:00:30.000Z");
  const prisma = {
    page: {
      findMany: async (query) => {
        assert.deepEqual(query.where, {
          siteId: "site-1",
          publishedVersionId: { not: null },
        });
        assert.deepEqual(query.orderBy, { slug: "asc" });
        assert.equal(query.skip, 0);
        assert.equal(query.take, publicPublishedPageListMaxCount);
        assert.deepEqual(query.select, {
          id: true,
          publishedVersionId: true,
          slug: true,
        });

        return [
          {
            id: "page-home",
            publishedVersionId: "version-1",
            slug: "home",
          },
          {
            id: "page-terms",
            publishedVersionId: "version-3",
            slug: "legal/terms",
          },
          {
            id: "page-german",
            publishedVersionId: "version-4",
            slug: "de-kampagne",
          },
          {
            id: "page-broken",
            publishedVersionId: "missing-version",
            slug: "broken-page",
          },
        ];
      },
    },
    pageVersion: {
      findMany: async (query) => {
        assert.deepEqual(query.where, {
          id: {
            in: ["version-1", "version-3", "version-4", "missing-version"],
          },
          pageId: {
            in: ["page-home", "page-terms", "page-german", "page-broken"],
          },
        });

        return [
          {
            createdAt: versionCreatedAt,
            id: "version-1",
            pageId: "page-home",
            publishedAt,
            schema: createPublicPageSchema("home", "Home"),
          },
          {
            createdAt: new Date("2026-08-19T00:02:00.000Z"),
            id: "version-3",
            pageId: "page-terms",
            publishedAt: null,
            schema: createPublicPageSchema("legal/terms", "Terms", {
              noIndex: true,
            }),
          },
          {
            createdAt: versionCreatedAt,
            id: "version-4",
            pageId: "page-german",
            publishedAt,
            schema: createPublicPageSchema(
              "de-kampagne",
              "German Campaign",
              { locale: "de-DE" },
            ),
          },
        ];
      },
    },
    site: {
      findUnique: async () => createPublicSite(),
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
      updatedAt: "2026-08-19T00:01:00.000Z",
    },
    {
      noIndex: true,
      slug: "legal/terms",
      title: "Terms",
      publishedAt: null,
      updatedAt: "2026-08-19T00:02:00.000Z",
    },
  ]);
  assert.equal(result.meta.total, 2);
  assert.equal(result.meta.pageLimit, publicPublishedPageListMaxCount);
  assert.equal(result.meta.tenantId, "tenant-1");
  assert.equal(result.meta.requestId, "request-public-list");
});

test("listPublishedPages reads schema from the published version only", async () => {
  const publishedAt = new Date("2026-08-19T00:01:00.000Z");
  const versionCreatedAt = new Date("2026-08-19T00:00:30.000Z");
  const prisma = {
    page: {
      findMany: async () => [
        {
          id: "page-campaign",
          publishedVersionId: "version-published",
          slug: "campaign",
        },
      ],
    },
    pageVersion: {
      findMany: async (query) => {
        assert.deepEqual(query.where.id, { in: ["version-published"] });

        return [
          {
            createdAt: versionCreatedAt,
            id: "version-published",
            pageId: "page-campaign",
            publishedAt,
            schema: createPublicPageSchema("campaign", "Campaign"),
          },
        ];
      },
    },
    site: {
      findUnique: async () => createPublicSite(),
    },
  };

  const result = await listPublishedPages(prisma, {
    locale: "en-US",
    market: "us",
  });

  assert.deepEqual(
    result.data.map((page) => page.slug),
    ["campaign"],
  );
  assert.equal(result.data[0].title, "Campaign");
  assert.equal(result.data[0].publishedAt, "2026-08-19T00:01:00.000Z");
  assert.equal(result.data[0].updatedAt, "2026-08-19T00:01:00.000Z");
  assert.equal(result.meta.total, 1);
});

test("listPublishedPages skips corrupt published schemas", async () => {
  const publishedAt = new Date("2026-08-19T00:01:00.000Z");
  const prisma = {
    page: {
      findMany: async () => [
        {
          id: "page-broken",
          publishedVersionId: "version-broken",
          slug: "broken",
        },
        {
          id: "page-home",
          publishedVersionId: "version-valid",
          slug: "home",
        },
      ],
    },
    pageVersion: {
      findMany: async () => [
        {
          createdAt: new Date("2026-08-19T00:00:00.000Z"),
          id: "version-broken",
          pageId: "page-broken",
          publishedAt,
          schema: {
            meta: {
              slug: "broken",
            },
          },
        },
        {
          createdAt: new Date("2026-08-19T00:00:00.000Z"),
          id: "version-valid",
          pageId: "page-home",
          publishedAt,
          schema: createPublicPageSchema("home", "Home"),
        },
      ],
    },
    site: {
      findUnique: async () => createPublicSite(),
    },
  };

  const result = await listPublishedPages(prisma, {
    locale: "en-US",
    market: "us",
  });

  assert.deepEqual(
    result.data.map((page) => page.slug),
    ["home"],
  );
  assert.equal(result.meta.total, 1);
});

test("listPublishedPages continues past fully filtered candidate batches", async () => {
  const staleLocalePages = Array.from(
    { length: publicPublishedPageListMaxCount },
    (_value, index) => ({
      id: `page-de-${index}`,
      publishedVersionId: `version-de-${index}`,
      slug: `de-campaign-${index}`,
    }),
  );
  const validPage = {
    id: "page-home",
    publishedVersionId: "version-home",
    slug: "home",
  };
  const pagesByVersionId = new Map(
    [...staleLocalePages, validPage].map((page) => [
      page.publishedVersionId,
      page,
    ]),
  );
  const pageCalls = [];
  const versionBatchSizes = [];
  const prisma = {
    page: {
      findMany: async (query) => {
        pageCalls.push({ skip: query.skip, take: query.take });

        if (query.skip === 0) {
          return staleLocalePages;
        }

        if (query.skip === publicPublishedPageListMaxCount) {
          return [validPage];
        }

        return [];
      },
    },
    pageVersion: {
      findMany: async (query) => {
        versionBatchSizes.push(query.where.id.in.length);

        return query.where.id.in.map((versionId) => {
          const page = pagesByVersionId.get(versionId);
          const isValidPage = versionId === validPage.publishedVersionId;

          return {
            createdAt: new Date("2026-08-19T00:00:00.000Z"),
            id: versionId,
            pageId: page.id,
            publishedAt: new Date("2026-08-19T00:01:00.000Z"),
            schema: createPublicPageSchema(page.slug, page.slug, {
              locale: isValidPage ? "en-US" : "de-DE",
            }),
          };
        });
      },
    },
    site: {
      findUnique: async () => createPublicSite(),
    },
  };

  const result = await listPublishedPages(prisma, {
    locale: "en-US",
    market: "us",
  });

  assert.deepEqual(
    result.data.map((page) => page.slug),
    ["home"],
  );
  assert.deepEqual(pageCalls, [
    { skip: 0, take: publicPublishedPageListMaxCount },
    {
      skip: publicPublishedPageListMaxCount,
      take: publicPublishedPageListMaxCount,
    },
  ]);
  assert.deepEqual(versionBatchSizes, [publicPublishedPageListMaxCount, 1]);
  assert.equal(result.meta.total, 1);
});
