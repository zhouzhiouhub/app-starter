import assert from "node:assert/strict";
import test from "node:test";
import { publicTranslationMessageMaxLength } from "@app-starter/schema";
import { getPublicTranslationMessages } from "../src/lib/public-translations.ts";

test("public translation lookup forwards storefront hosts for cache scoping", async () => {
  const requests = [];

  await withFetch(
    async (url, init) => {
      requests.push({ init, url: String(url) });
      return jsonResponse({
        data: {
          locale: "en-US",
          messages: Object.fromEntries([
            ["page.home.hero.title", "Translated hero title"],
            ["__proto__", "polluted"],
            [" constructor ", "trimmed unsafe"],
            ["page.home\u0000title", "control unsafe"],
            [
              "page.home.hero.body",
              "a".repeat(publicTranslationMessageMaxLength + 1),
            ],
          ]),
        },
      });
    },
    async () => {
      const messages = await getPublicTranslationMessages({
        locale: "en-US",
        storefrontHost: "Store.Brand-Platform.com:443",
      });

      assert.deepEqual(messages, {
        "page.home.hero.title": "Translated hero title",
      });
      assert.equal(
        Object.prototype.hasOwnProperty.call(messages, "__proto__"),
        false,
      );
    },
  );

  assert.equal(requests.length, 1);
  assert.match(
    requests[0].url,
    /\/public\/translations\/en-US\?storefrontHost=store\.brand-platform\.com$/,
  );
  assert.deepEqual(requests[0].init.headers, {
    "x-storefront-host": "store.brand-platform.com",
  });
  assert.equal(requests[0].init.next.revalidate, 60);
  assert.equal(requests[0].init.next.tags.length, 2);
  assert.match(
    requests[0].init.next.tags[0],
    /^public-translation:site:[a-z0-9]+$/,
  );
  assert.equal(
    requests[0].init.next.tags[1],
    `${requests[0].init.next.tags[0]}:en-US`,
  );
  assert.equal(requests[0].init.redirect, "manual");
  assert.equal(requests[0].init.signal instanceof AbortSignal, true);
  assert.equal(requests[0].init.signal.aborted, false);
});

test("public translation lookup can bypass ISR caching for preview routes", async () => {
  const requests = [];

  await withFetch(
    async (url, init) => {
      requests.push({ init, url: String(url) });
      return jsonResponse({
        data: {
          locale: "en-US",
          messages: {
            "page.home.hero.title": "Preview title",
          },
        },
      });
    },
    async () => {
      assert.deepEqual(
        await getPublicTranslationMessages({
          cacheMode: "no-store",
          locale: "en-US",
        }),
        {
          "page.home.hero.title": "Preview title",
        },
      );
    },
  );

  assert.equal(requests.length, 1);
  assert.equal(requests[0].init.cache, "no-store");
  assert.equal(requests[0].init.next, undefined);
  assert.equal(requests[0].init.redirect, "manual");
  assert.equal(requests[0].init.signal instanceof AbortSignal, true);
  assert.equal(requests[0].init.signal.aborted, false);
});

test("public translation lookup accepts declared fallback locale messages", async () => {
  await withFetch(
    async () =>
      jsonResponse({
        data: {
          locale: "en-US",
          messages: {
            "page.home.hero.title": "Default locale title",
          },
        },
        meta: {
          isFallback: true,
          locale: "en-US",
        },
      }),
    async () => {
      assert.deepEqual(
        await getPublicTranslationMessages({ locale: "de-DE" }),
        {
          "page.home.hero.title": "Default locale title",
        },
      );
    },
  );
});

test("public translation lookup rejects undeclared locale mismatches", async () => {
  await withFetch(
    async () =>
      jsonResponse({
        data: {
          locale: "fr-FR",
          messages: {
            "page.home.hero.title": "Wrong locale title",
          },
        },
        meta: {
          isFallback: false,
          locale: "fr-FR",
        },
      }),
    async () => {
      assert.deepEqual(
        await getPublicTranslationMessages({ locale: "de-DE" }),
        {},
      );
    },
  );
});

test("public translation lookup returns empty messages for invalid locales", async () => {
  const requests = [];

  await withFetch(
    async (url) => {
      requests.push(String(url));
      return jsonResponse({
        data: {
          locale: "en-US",
          messages: {
            "page.home.hero.title": "Translated hero title",
          },
        },
      });
    },
    async () => {
      assert.deepEqual(
        await getPublicTranslationMessages({ locale: "bad_locale" }),
        {},
      );
    },
  );

  assert.deepEqual(requests, []);
});

test("public translation lookup keeps default rendering available on failures", async () => {
  await withFetch(
    async () => ({
      ok: false,
      async json() {
        throw new Error("unexpected body read");
      },
    }),
    async () => {
      assert.deepEqual(
        await getPublicTranslationMessages({ locale: "en-US" }),
        {},
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
