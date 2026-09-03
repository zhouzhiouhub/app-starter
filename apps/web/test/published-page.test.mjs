import assert from "node:assert/strict";
import test from "node:test";
import { createFallbackPage } from "@app-starter/schema";
import { getPreviewPage, getPublishedPage } from "../src/lib/published-page.ts";

test("published page lookup rejects invalid explicit locale before fetching", async () => {
  const requests = [];

  await withFetch(
    async (url) => {
      requests.push(String(url));
      return {
        ok: false,
        async json() {
          return {};
        },
      };
    },
    async () => {
      assert.equal(
        await getPublishedPage({
          locale: "bad_locale",
          slug: "home",
        }),
        null,
      );
    },
  );

  assert.deepEqual(requests, []);
});

test("published page lookup forwards the safe storefront host", async () => {
  const requests = [];

  await withFetch(
    async (url, init) => {
      requests.push({ init, url: String(url) });
      return jsonResponse({ data: createFallbackPage({ slug: "home" }) });
    },
    async () => {
      const page = await getPublishedPage({
        locale: "en-US",
        slug: "home",
        storefrontHost: "Store.Brand-Platform.com:443",
      });

      assert.equal(page?.meta.slug, "home");
    },
  );

  assert.equal(requests.length, 1);
  assert.match(requests[0].url, /storefrontHost=store\.brand-platform\.com/);
  assert.equal(
    requests[0].init.headers["x-storefront-host"],
    "store.brand-platform.com",
  );
  assert.equal(requests[0].init.redirect, "manual");
  assertPublicApiAbortSignal(requests[0].init.signal);
  assert.equal(requests[0].init.next.tags.length, 3);
  assert.match(
    requests[0].init.next.tags[0],
    /^published-page:site:[a-z0-9]+$/,
  );
  assert.equal(
    requests[0].init.next.tags[1],
    `${requests[0].init.next.tags[0]}:us:en-US`,
  );
  assert.equal(
    requests[0].init.next.tags[2],
    `${requests[0].init.next.tags[0]}:us:en-US:home`,
  );
});

test("published page lookup forwards placeholder storefront hosts for rejection", async () => {
  const requests = [];

  await withFetch(
    async (url, init) => {
      requests.push({ init, url: String(url) });
      return jsonResponse({ data: createFallbackPage({ slug: "home" }) });
    },
    async () => {
      await getPublishedPage({
        locale: "en-US",
        slug: "home",
        storefrontHost: "store.example.com",
      });
    },
  );

  assert.equal(requests.length, 1);
  assert.match(requests[0].url, /storefrontHost=store\.example\.com/);
  assert.equal(requests[0].init.headers["x-storefront-host"], "store.example.com");
});

test("published page lookup does not forward local storefront hosts", async () => {
  const requests = [];

  await withFetch(
    async (url, init) => {
      requests.push({ init, url: String(url) });
      return jsonResponse({ data: createFallbackPage({ slug: "home" }) });
    },
    async () => {
      await getPublishedPage({
        locale: "en-US",
        slug: "home",
        storefrontHost: "internal.localhost",
      });
    },
  );

  assert.equal(requests.length, 1);
  assert.doesNotMatch(requests[0].url, /storefrontHost=/);
  assert.equal(requests[0].init.headers, undefined);
});

test("published page lookup rejects schema context mismatches", async () => {
  const mismatchedPages = [
    createFallbackPage({ slug: "campaign" }),
    createFallbackPage({ locale: "de-DE", slug: "home" }),
    createFallbackPage({ market: "ca", slug: "home" }),
  ];
  const requests = [];

  for (const data of mismatchedPages) {
    await withFetch(
      async (url) => {
        requests.push(String(url));
        return jsonResponse({ data });
      },
      async () => {
        assert.equal(
          await getPublishedPage({
            locale: "en-US",
            slug: "home",
          }),
          null,
        );
      },
    );
  }

  assert.equal(requests.length, 3);
});

test("published page lookup rejects unresolved media references", async () => {
  const schema = createFallbackPage({ slug: "home" });
  schema.sections[0].props.image = "media://asset-missing";

  await withFetch(
    async () => jsonResponse({ data: schema }),
    async () => {
      assert.equal(
        await getPublishedPage({
          locale: "en-US",
          slug: "home",
        }),
        null,
      );
    },
  );
});

test("published page lookup accepts declared locale fallback responses", async () => {
  const requests = [];

  await withFetch(
    async (url) => {
      requests.push(String(url));
      return jsonResponse({
        data: createFallbackPage({ locale: "en-US", slug: "home" }),
        meta: {
          fallbackLocale: "en-US",
          isFallback: true,
          locale: "en-US",
          market: "us",
        },
      });
    },
    async () => {
      const page = await getPublishedPage({
        locale: "de-DE",
        slug: "home",
      });

      assert.equal(page?.meta.locale, "en-US");
      assert.equal(page?.meta.slug, "home");
    },
  );

  assert.equal(requests.length, 1);
  assert.match(requests[0], /locale=de-DE/);
});

test("preview page lookup rejects malformed tokens before fetching", async () => {
  const requests = [];

  await withFetch(
    async (url) => {
      requests.push(String(url));
      return previewJsonResponse(createFallbackPage({ slug: "home" }));
    },
    async () => {
      for (const token of [
        "",
        "payload.signature.extra",
        "payload.signature!",
        `payload.${"a".repeat(42)}`,
        `${"a".repeat(2049)}.${"b".repeat(43)}`,
        " payload.aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa ",
      ]) {
        assert.equal(await getPreviewPage(token), null);
      }
    },
  );

  assert.deepEqual(requests, []);
});

test("preview page lookup fetches only compact token candidates", async () => {
  const requests = [];
  const token = `payload.${"a".repeat(43)}`;

  await withFetch(
    async (url, init) => {
      requests.push({ init, url: String(url) });
      return previewJsonResponse(
        createFallbackPage({ slug: "campaign", title: "Campaign" }),
      );
    },
    async () => {
      const page = await getPreviewPage(token);

      assert.equal(page?.meta.slug, "campaign");
    },
  );

  assert.equal(requests.length, 1);
  assert.match(requests[0].url, /\/public\/preview\/payload\.a{43}$/);
  assertPublicApiAbortSignal(requests[0].init.signal);
  assert.deepEqual(readFetchInitWithoutSignal(requests[0].init), {
    cache: "no-store",
    redirect: "manual",
  });
});

test("preview page lookup rejects non-preview responses", async () => {
  const requests = [];
  const token = `payload.${"a".repeat(43)}`;

  await withFetch(
    async (url) => {
      requests.push(String(url));
      return jsonResponse({
        data: createFallbackPage({ slug: "campaign" }),
        meta: { slug: "campaign" },
      });
    },
    async () => {
      assert.equal(await getPreviewPage(token), null);
    },
  );

  assert.equal(requests.length, 1);
});

test("preview page lookup rejects schema and response slug mismatches", async () => {
  const requests = [];
  const token = `payload.${"a".repeat(43)}`;

  await withFetch(
    async (url) => {
      requests.push(String(url));
      return jsonResponse({
        data: createFallbackPage({ slug: "campaign" }),
        meta: { preview: true, slug: "home" },
      });
    },
    async () => {
      assert.equal(await getPreviewPage(token), null);
    },
  );

  assert.equal(requests.length, 1);
});

test("preview page lookup forwards the safe storefront host", async () => {
  const requests = [];
  const token = `payload.${"a".repeat(43)}`;

  await withFetch(
    async (url, init) => {
      requests.push({ init, url: String(url) });
      return previewJsonResponse(
        createFallbackPage({ slug: "campaign", title: "Campaign" }),
      );
    },
    async () => {
      const page = await getPreviewPage(token, {
        storefrontHost: "Store.Brand-Platform.com:443",
      });

      assert.equal(page?.meta.slug, "campaign");
    },
  );

  assert.equal(requests.length, 1);
  assert.match(requests[0].url, /\/public\/preview\/payload\.a{43}$/);
  assertPublicApiAbortSignal(requests[0].init.signal);
  assert.deepEqual(readFetchInitWithoutSignal(requests[0].init), {
    cache: "no-store",
    headers: {
      "x-storefront-host": "store.brand-platform.com",
    },
    redirect: "manual",
  });
});

function assertPublicApiAbortSignal(signal) {
  assert.equal(signal instanceof AbortSignal, true);
  assert.equal(signal.aborted, false);
}

function readFetchInitWithoutSignal(init) {
  const { signal: _signal, ...fetchInit } = init;
  return fetchInit;
}

function jsonResponse(data) {
  return {
    ok: true,
    async json() {
      return data;
    },
  };
}

function previewJsonResponse(data) {
  return jsonResponse({
    data,
    meta: {
      preview: true,
      slug: data.meta.slug,
    },
  });
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
