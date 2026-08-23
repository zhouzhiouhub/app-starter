import assert from "node:assert/strict";
import test from "node:test";
import { getPublishedPageBySlug } from "../dist/modules/pages/use-cases/get-published-page-by-slug.js";
import { listPublishedPages } from "../dist/modules/pages/use-cases/list-published-pages.js";
import {
  createPublicPageSchema,
  createPublicSite,
} from "./pages-public-test-helpers.mjs";

test("listPublishedPages filters summaries by published locale and market", async () => {
  const updatedAt = new Date("2026-08-19T00:00:00.000Z");
  const publishedAt = new Date("2026-08-19T00:01:00.000Z");
  const prisma = {
    page: {
      findMany: async () => [
        {
          id: "page-home",
          publishedVersionId: "version-1",
          slug: "home",
        },
        {
          id: "page-kampagne",
          publishedVersionId: "version-2",
          slug: "kampagne",
        },
      ],
    },
    pageVersion: {
      findMany: async () => [
        {
          createdAt: updatedAt,
          id: "version-1",
          pageId: "page-home",
          publishedAt,
          schema: createPublicPageSchema("home", "Home"),
        },
        {
          createdAt: updatedAt,
          id: "version-2",
          pageId: "page-kampagne",
          publishedAt,
          schema: createPublicPageSchema("kampagne", "Kampagne", {
            locale: "de-DE",
          }),
        },
      ],
    },
    site: {
      findUnique: async () => createPublicSite(),
    },
  };

  const result = await listPublishedPages(prisma, {
    locale: "de-DE",
    market: "us",
  });

  assert.deepEqual(
    result.data.map((page) => page.slug),
    ["kampagne"],
  );
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
          id: "page-home",
          publishedVersionId: "version-1",
          slug: "home",
        };
      },
    },
    pageVersion: {
      findFirst: async (query) => {
        assert.deepEqual(query.where, {
          id: "version-1",
          pageId: "page-home",
        });

        return {
          schema: createPublicPageSchema("home", "Home"),
        };
      },
    },
    site: {
      findUnique: async () => createPublicSite(),
    },
  };

  const result = await getPublishedPageBySlug(prisma, "home", {
    locale: "de-DE",
    market: "us",
  });

  assert.equal(result, null);
});

test("getPublishedPageBySlug returns null for corrupt published schemas", async () => {
  const prisma = {
    page: {
      findUnique: async () => ({
        id: "page-home",
        publishedVersionId: "version-1",
        slug: "home",
      }),
    },
    pageVersion: {
      findFirst: async () => ({
        schema: {
          meta: {
            slug: "home",
          },
        },
      }),
    },
    site: {
      findUnique: async () => createPublicSite(),
    },
  };

  const result = await getPublishedPageBySlug(prisma, "home", {
    locale: "en-US",
    market: "us",
  });

  assert.equal(result, null);
});

test("getPublishedPageBySlug returns null when the request host has no site", async () => {
  const prisma = {
    page: {
      findUnique: async () => {
        throw new Error("pages must not be queried without a matching site.");
      },
    },
    site: {
      findUnique: async (query) => {
        assert.deepEqual(query.where, {
          domain: "missing.brand-platform.com",
        });
        return null;
      },
    },
  };

  const result = await getPublishedPageBySlug(prisma, "home", {
    locale: "en-US",
    market: "us",
    siteHost: "missing.brand-platform.com",
  });

  assert.equal(result, null);
});

test("listPublishedPages returns an empty result for unmatched request hosts", async () => {
  const prisma = {
    page: {
      findMany: async () => {
        throw new Error("pages must not be listed without a matching site.");
      },
    },
    site: {
      findUnique: async () => null,
    },
  };

  const result = await listPublishedPages(
    prisma,
    {
      locale: "en-US",
      market: "us",
      siteHost: "missing.brand-platform.com",
    },
    "request-public-unmatched-site",
  );

  assert.deepEqual(result, {
    data: [],
    meta: {
      requestId: "request-public-unmatched-site",
      tenantId: null,
      siteId: null,
      total: 0,
    },
  });
});
