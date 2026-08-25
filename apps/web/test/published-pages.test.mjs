import assert from "node:assert/strict";
import test from "node:test";
import { publicPublishedPageListMaxCount } from "../../../packages/schema/dist/index.js";
import { listPublishedPages } from "../src/lib/published-pages.ts";

test("published pages list falls back from invalid runtime defaults", async () => {
  await withEnv(
    {
      DEFAULT_LOCALE: "bad_locale",
      DEFAULT_MARKET: "US",
    },
    async () => {
      const requests = [];

      await withFetch(
        async (url) => {
          requests.push(String(url));
          return jsonResponse({ data: [] });
        },
        async () => {
          assert.deepEqual(await listPublishedPages(), []);
        },
      );

      assert.equal(requests.length, 1);
      assert.match(requests[0], /locale=en-US/);
      assert.match(requests[0], /market=us/);
    },
  );
});

test("published pages list rejects invalid explicit locale or market", async () => {
  const requests = [];

  await withFetch(
    async (url) => {
      requests.push(String(url));
      return jsonResponse({ data: [] });
    },
    async () => {
      assert.deepEqual(
        await listPublishedPages({ locale: "bad_locale", market: "us" }),
        [],
      );
      assert.deepEqual(
        await listPublishedPages({ locale: "en-US", market: "US" }),
        [],
      );
    },
  );

  assert.deepEqual(requests, []);
});

test("published pages list forwards the safe storefront host", async () => {
  const requests = [];

  await withFetch(
    async (url, init) => {
      requests.push({ init, url: String(url) });
      return jsonResponse({
        data: [
          {
            noIndex: false,
            slug: "home",
            title: "Home",
            updatedAt: "2026-08-19T00:00:00.000Z",
          },
        ],
      });
    },
    async () => {
      const pages = await listPublishedPages({
        locale: "en-US",
        market: "us",
        storefrontHost: "Store.Brand-Platform.com",
      });

      assert.deepEqual(
        pages.map((page) => page.slug),
        ["home"],
      );
    },
  );

  assert.equal(requests.length, 1);
  assert.match(requests[0].url, /storefrontHost=store\.brand-platform\.com/);
  assert.equal(
    requests[0].init.headers["x-storefront-host"],
    "store.brand-platform.com",
  );
  assert.equal(requests[0].init.redirect, "manual");
  assert.equal(requests[0].init.next.tags.length, 2);
  assert.match(
    requests[0].init.next.tags[0],
    /^published-page:site:[a-z0-9]+$/,
  );
  assert.equal(
    requests[0].init.next.tags[1],
    `${requests[0].init.next.tags[0]}:us:en-US`,
  );
});

test("published pages list tags fallback locale and market contexts", async () => {
  await withEnv(
    {
      DEFAULT_LOCALE: "en-US",
      DEFAULT_MARKET: "us",
      FALLBACK_LOCALE: "en-US",
    },
    async () => {
      const requests = [];

      await withFetch(
        async (url, init) => {
          requests.push({ init, url: String(url) });
          return jsonResponse({ data: [] });
        },
        async () => {
          assert.deepEqual(
            await listPublishedPages({ locale: "de-DE", market: "eu" }),
            [],
          );
        },
      );

      assert.equal(requests.length, 1);
      assert.match(requests[0].url, /locale=de-DE/);
      assert.match(requests[0].url, /market=eu/);
      assert.deepEqual(requests[0].init.next.tags, [
        "published-page",
        "published-page:eu:de-DE",
        "published-page:us:en-US",
      ]);
    },
  );
});

test("published pages list drops unsafe summary slugs", async () => {
  await withFetch(
    async () =>
      jsonResponse({
        data: [
          {
            noIndex: false,
            slug: "home",
            title: "Home",
            updatedAt: "2026-08-21T00:00:00.000Z",
          },
          {
            noIndex: false,
            slug: "../admin",
            title: "Bad",
            updatedAt: "2026-08-21T00:00:00.000Z",
          },
          {
            noIndex: false,
            slug: "campaign<script>",
            title: "Bad",
            updatedAt: "2026-08-21T00:00:00.000Z",
          },
        ],
      }),
    async () => {
      const pages = await listPublishedPages({
        locale: "en-US",
        market: "us",
      });

      assert.deepEqual(
        pages.map((page) => page.slug),
        ["home"],
      );
    },
  );
});

test("published pages list drops invalid summary timestamps", async () => {
  await withFetch(
    async () =>
      jsonResponse({
        data: [
          {
            noIndex: false,
            publishedAt: "2026-08-20T00:00:00Z",
            slug: "home",
            title: "Home",
            updatedAt: "2026-08-21T00:00:00Z",
          },
          {
            noIndex: false,
            slug: "bad-date",
            title: "Bad date",
            updatedAt: "not-a-date",
          },
          {
            noIndex: false,
            publishedAt: "also-not-a-date",
            slug: "invalid-published-date",
            title: "No published date",
            updatedAt: "2026-08-22T00:00:00Z",
          },
        ],
      }),
    async () => {
      const pages = await listPublishedPages({
        locale: "en-US",
        market: "us",
      });

      assert.deepEqual(pages, [
        {
          noIndex: false,
          publishedAt: "2026-08-20T00:00:00.000Z",
          slug: "home",
          title: "Home",
          updatedAt: "2026-08-21T00:00:00.000Z",
        },
        {
          noIndex: false,
          publishedAt: null,
          slug: "invalid-published-date",
          title: "No published date",
          updatedAt: "2026-08-22T00:00:00.000Z",
        },
      ]);
    },
  );
});

test("published pages list drops summaries with malformed noIndex flags", async () => {
  await withFetch(
    async () =>
      jsonResponse({
        data: [
          {
            noIndex: true,
            slug: "hidden",
            title: "Hidden",
            updatedAt: "2026-08-21T00:00:00.000Z",
          },
          {
            noIndex: "true",
            slug: "string-noindex",
            title: "Malformed noIndex",
            updatedAt: "2026-08-21T00:00:00.000Z",
          },
          {
            slug: "missing-noindex",
            title: "Missing noIndex",
            updatedAt: "2026-08-21T00:00:00.000Z",
          },
        ],
      }),
    async () => {
      const pages = await listPublishedPages({
        locale: "en-US",
        market: "us",
      });

      assert.deepEqual(
        pages.map((page) => ({ noIndex: page.noIndex, slug: page.slug })),
        [{ noIndex: true, slug: "hidden" }],
      );
    },
  );
});

test("published pages list caps after filtering invalid summaries", async () => {
  await withFetch(
    async () =>
      jsonResponse({
        data: [
          {
            noIndex: false,
            slug: "../admin",
            title: "Bad",
            updatedAt: "2026-08-21T00:00:00.000Z",
          },
          ...Array.from(
            { length: publicPublishedPageListMaxCount },
            (_value, index) => ({
              noIndex: false,
              slug: index === 0 ? "home" : `campaign-${index}`,
              title: `Campaign ${index}`,
              updatedAt: "2026-08-21T00:00:00.000Z",
            }),
          ),
        ],
      }),
    async () => {
      const pages = await listPublishedPages({
        locale: "en-US",
        market: "us",
      });

      assert.equal(pages.length, publicPublishedPageListMaxCount);
      assert.equal(pages[0].slug, "home");
      assert.equal(pages.at(-1).slug, "campaign-999");
    },
  );
});

test("published pages list caps oversized API responses", async () => {
  await withFetch(
    async () =>
      jsonResponse({
        data: Array.from(
          { length: publicPublishedPageListMaxCount + 2 },
          (_value, index) => ({
            noIndex: false,
            slug: index === 0 ? "home" : `campaign-${index}`,
            title: `Campaign ${index}`,
            updatedAt: "2026-08-21T00:00:00.000Z",
          }),
        ),
      }),
    async () => {
      const pages = await listPublishedPages({
        locale: "en-US",
        market: "us",
      });

      assert.equal(pages.length, publicPublishedPageListMaxCount);
      assert.equal(pages.at(-1).slug, "campaign-999");
    },
  );
});

function jsonResponse(data) {
  return {
    ok: true,
    async json() {
      return data;
    },
  };
}

async function withFetch(fetchImplementation, fn) {
  const previous = globalThis.fetch;
  globalThis.fetch = fetchImplementation;

  try {
    return await fn();
  } finally {
    globalThis.fetch = previous;
  }
}

async function withEnv(values, fn) {
  const previous = Object.fromEntries(
    Object.keys(values).map((key) => [key, process.env[key]]),
  );

  for (const [key, value] of Object.entries(values)) {
    process.env[key] = value;
  }

  try {
    return await fn();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}
