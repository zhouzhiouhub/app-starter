import assert from "node:assert/strict";
import test from "node:test";
import {
  getLocalizationSummary,
  upsertDefaultTranslationEntry,
} from "../src/features/localization/api.ts";

test("localization API upserts default translation entries with idempotency", async () => {
  const requests = [];
  const entry = {
    context: "Homepage hero",
    key: "page.home.hero.title",
    locale: "en-US",
    updatedAt: "2026-08-26T00:00:00.000Z",
    value: "Build better storefronts",
  };

  await withFetch(
    async (url, init) => {
      requests.push({ init, url: String(url) });
      return jsonResponse({ data: entry });
    },
    async () => {
      assert.deepEqual(
        await upsertDefaultTranslationEntry({
          context: "Homepage hero",
          key: "page.home.hero.title",
          locale: "en-US",
          value: "Build better storefronts",
        }),
        {
          entry,
          writeMode: "updated",
        },
      );
    },
  );

  assert.equal(requests[0].url, "/api/v1/translations");
  assert.equal(requests[0].init.method, "POST");
  assert.deepEqual(JSON.parse(requests[0].init.body), {
    context: "Homepage hero",
    key: "page.home.hero.title",
    locale: "en-US",
    value: "Build better storefronts",
  });
  assert.equal(
    requests[0].init.headers.get("Content-Type"),
    "application/json",
  );
  assert.match(
    requests[0].init.headers.get("Idempotency-Key"),
    /^[0-9a-f-]{36}$/,
  );
});

test("localization API forwards translation list filters", async () => {
  const requests = [];

  await withFetch(
    async (url) => {
      requests.push(String(url));

      if (String(url).endsWith("/markets")) {
        return jsonResponse({
          data: [
            {
              code: "us",
              currency: "USD",
              defaultLocale: "en-US",
              status: "active",
            },
          ],
        });
      }

      if (String(url).endsWith("/locales")) {
        return jsonResponse({
          data: [
            {
              code: "en-US",
              fallbackLocale: "en-US",
              status: "active",
            },
          ],
        });
      }

      return jsonResponse({
        data: [],
        meta: {
          entryLimit: 2000,
          expectedKeyCount: 2,
          fallbackLocale: "en-US",
          isFallback: true,
          limit: 10,
          locale: "en-US",
          missingKeyCount: 1,
          missingKeyPreviewLimit: 50,
          missingKeys: ["page.home.hero.body"],
          namespace: "page.home",
          page: 2,
          query: "hero",
          total: 21,
        },
      });
    },
    async () => {
      const summary = await getLocalizationSummary({
        limit: 10,
        namespace: "page.home",
        page: 2,
        query: "hero",
      });

      assert.equal(summary.translationsMeta.expectedKeyCount, 2);
      assert.equal(summary.translationsMeta.limit, 10);
      assert.equal(summary.translationsMeta.missingKeyCount, 1);
      assert.deepEqual(summary.translationsMeta.missingKeys, [
        "page.home.hero.body",
      ]);
      assert.equal(summary.translationsMeta.namespace, "page.home");
      assert.equal(summary.translationsMeta.page, 2);
      assert.equal(summary.translationsMeta.query, "hero");
      assert.equal(summary.translationsMeta.total, 21);
    },
  );

  assert.equal(
    requests.find((url) => url.includes("/translations?")),
    "/api/v1/translations?locale=de-DE&page=2&limit=10&namespace=page.home&q=hero",
  );
});

test("localization API rejects malformed translation responses", async () => {
  for (const body of [{}, { data: null }, { data: { locale: "en-US" } }]) {
    await withFetch(
      async () => jsonResponse(body),
      async () => {
        await assert.rejects(
          () =>
            upsertDefaultTranslationEntry({
              key: "page.home.hero.title",
              locale: "en-US",
              value: "Build better storefronts",
            }),
          /Translation entry could not be saved/,
        );
      },
    );
  }
});

function jsonResponse(body) {
  return new Response(JSON.stringify(body), { status: 200 });
}

async function withFetch(fetchImplementation, callback) {
  const previous = globalThis.fetch;
  globalThis.fetch = fetchImplementation;

  try {
    return await callback();
  } finally {
    globalThis.fetch = previous;
  }
}
