import assert from "node:assert/strict";
import test from "node:test";
import { upsertDefaultTranslationEntry } from "../src/features/localization/api.ts";

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
        entry,
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
