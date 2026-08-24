import assert from "node:assert/strict";
import test from "node:test";
import { getPublicTranslationMessages } from "../src/lib/public-translations.ts";

test("public translation lookup forwards storefront hosts for cache scoping", async () => {
  const requests = [];

  await withFetch(
    async (url, init) => {
      requests.push({ init, url: String(url) });
      return jsonResponse({
        data: {
          messages: Object.fromEntries([
            ["page.home.hero.title", "Translated hero title"],
            ["__proto__", "polluted"],
            [" constructor ", "trimmed unsafe"],
            ["page.home\u0000title", "control unsafe"],
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
  assert.deepEqual(requests[0].init, {
    headers: {
      "x-storefront-host": "store.brand-platform.com",
    },
    next: {
      revalidate: 60,
    },
    redirect: "manual",
  });
});

test("public translation lookup returns empty messages for invalid locales", async () => {
  const requests = [];

  await withFetch(
    async (url) => {
      requests.push(String(url));
      return jsonResponse({
        data: {
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
