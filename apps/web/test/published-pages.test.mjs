import assert from "node:assert/strict";
import test from "node:test";
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

test("published pages list drops unsafe summary slugs", async () => {
  await withFetch(
    async () =>
      jsonResponse({
        data: [
          {
            slug: "home",
            title: "Home",
            updatedAt: "2026-08-21T00:00:00.000Z",
          },
          {
            slug: "../admin",
            title: "Bad",
            updatedAt: "2026-08-21T00:00:00.000Z",
          },
          {
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
