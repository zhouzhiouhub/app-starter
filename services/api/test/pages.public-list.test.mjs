import assert from "node:assert/strict";
import test from "node:test";
import { listPublishedPages } from "../dist/modules/pages/use-cases/list-published-pages.js";
import {
  createPublicPageSchema,
  createPublicSite,
} from "./pages-public-test-helpers.mjs";

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
                schema: createPublicPageSchema("home", "Home"),
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
                schema: createPublicPageSchema("legal/terms", "Terms"),
              },
              {
                id: "version-3",
                publishedAt: null,
                schema: createPublicPageSchema("legal/terms", "Terms", {
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
                schema: createPublicPageSchema(
                  "de-kampagne",
                  "German Campaign",
                  { locale: "de-DE" },
                ),
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

test("listPublishedPages reads schema from the published version only", async () => {
  const updatedAt = new Date("2026-08-19T00:00:00.000Z");
  const publishedAt = new Date("2026-08-19T00:01:00.000Z");
  const prisma = {
    page: {
      findMany: async () => [
        {
          publishedVersionId: "version-published",
          slug: "campaign",
          title: "Campaign",
          updatedAt,
          versions: [
            {
              id: "version-draft",
              publishedAt: null,
              schema: createPublicPageSchema("campaign", "Draft Campaign", {
                locale: "de-DE",
              }),
            },
            {
              id: "version-published",
              publishedAt,
              schema: createPublicPageSchema("campaign", "Campaign"),
            },
          ],
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

  assert.deepEqual(result.data.map((page) => page.slug), ["campaign"]);
  assert.equal(result.data[0].publishedAt, "2026-08-19T00:01:00.000Z");
  assert.equal(result.meta.total, 1);
});
