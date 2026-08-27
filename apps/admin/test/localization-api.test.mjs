import assert from "node:assert/strict";
import test from "node:test";
import {
  exportTranslations,
  getLocalizationSummary,
  importTranslations,
  previewTranslationExport,
  previewTranslationImport,
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

test("localization API previews translation import and export payloads", async () => {
  const requests = [];
  const importPreview = {
    entries: [
      {
        action: "create",
        index: 0,
        issues: [],
        key: "page.home.hero.title",
        locale: "en-US",
      },
    ],
    summary: {
      blockedCount: 0,
      createCount: 1,
      duplicateCount: 0,
      errorCount: 0,
      totalEntries: 1,
      updateCount: 0,
    },
  };
  const exportPreview = {
    exportableEntryCount: 1,
    expectedKeyCount: 1,
    locale: "en-US",
    missingKeyCount: 0,
    missingKeyPreviewLimit: 50,
    missingKeys: [],
    sampleKeyLimit: 50,
    sampleKeys: ["page.home.hero.title"],
  };

  await withFetch(
    async (url, init) => {
      requests.push({ init, url: String(url) });

      if (String(url).endsWith("/translations/import/preview")) {
        return jsonResponse({ data: importPreview });
      }

      return jsonResponse({ data: exportPreview });
    },
    async () => {
      assert.deepEqual(
        await previewTranslationImport({
          entries: [
            {
              key: "page.home.hero.title",
              value: "Build better storefronts",
            },
          ],
        }),
        importPreview,
      );
      assert.deepEqual(
        await previewTranslationExport(
          { namespace: "page.home", query: "hero" },
          "de-DE",
        ),
        exportPreview,
      );
    },
  );

  assert.equal(requests[0].url, "/api/v1/translations/import/preview");
  assert.equal(requests[0].init.method, "POST");
  assert.deepEqual(JSON.parse(requests[0].init.body), {
    entries: [
      {
        key: "page.home.hero.title",
        value: "Build better storefronts",
      },
    ],
  });
  assert.equal(requests[1].url, "/api/v1/translations/export/preview");
  assert.deepEqual(JSON.parse(requests[1].init.body), {
    locale: "de-DE",
    namespace: "page.home",
    q: "hero",
  });
});

test("localization API imports translation payloads with idempotency", async () => {
  const requests = [];
  const importResult = {
    entries: [
      {
        action: "create",
        context: "Homepage hero",
        index: 0,
        key: "page.home.hero.title",
        locale: "en-US",
        updatedAt: "2026-08-27T00:00:00.000Z",
        value: "Build better storefronts",
      },
    ],
    summary: {
      createdCount: 1,
      importedCount: 1,
      totalEntries: 1,
      updatedCount: 0,
    },
  };
  const payload = {
    entries: [
      {
        context: "Homepage hero",
        key: "page.home.hero.title",
        value: "Build better storefronts",
      },
    ],
  };

  await withFetch(
    async (url, init) => {
      requests.push({ init, url: String(url) });
      return jsonResponse({ data: importResult });
    },
    async () => {
      assert.deepEqual(await importTranslations(payload), importResult);
    },
  );

  assert.equal(requests[0].url, "/api/v1/translations/import");
  assert.equal(requests[0].init.method, "POST");
  assert.deepEqual(JSON.parse(requests[0].init.body), payload);
  assert.equal(
    requests[0].init.headers.get("Content-Type"),
    "application/json",
  );
  assert.match(
    requests[0].init.headers.get("Idempotency-Key"),
    /^[0-9a-f-]{36}$/,
  );
});

test("localization API exports translation JSON payloads", async () => {
  const requests = [];
  const exportResult = {
    contentType: "application/json",
    entries: [
      {
        context: "Homepage hero",
        key: "page.home.hero.title",
        locale: "en-US",
        updatedAt: "2026-08-27T00:00:00.000Z",
        value: "Build better storefronts",
      },
    ],
    entryCount: 1,
    expectedKeyCount: 1,
    exportVersion: "translation-export.v1",
    filename: "translations-en-US.json",
    format: "json",
    locale: "en-US",
    missingKeyCount: 0,
    missingKeyPreviewLimit: 50,
    missingKeys: [],
  };

  await withFetch(
    async (url, init) => {
      requests.push({ init, url: String(url) });
      return jsonResponse({ data: exportResult });
    },
    async () => {
      assert.deepEqual(
        await exportTranslations(
          { namespace: "page.home", query: "hero" },
          "de-DE",
        ),
        exportResult,
      );
    },
  );

  assert.equal(requests[0].url, "/api/v1/translations/export");
  assert.equal(requests[0].init.method, "POST");
  assert.deepEqual(JSON.parse(requests[0].init.body), {
    locale: "de-DE",
    namespace: "page.home",
    q: "hero",
  });
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

test("localization API rejects malformed translation export responses", async () => {
  for (const body of [
    {},
    { data: null },
    { data: { entries: [] } },
    { data: { contentType: "text/plain", entries: [], format: "json" } },
  ]) {
    await withFetch(
      async () => jsonResponse(body),
      async () => {
        await assert.rejects(
          () => exportTranslations({}, "en-US"),
          /Translation export could not be prepared/,
        );
      },
    );
  }
});

test("localization API rejects malformed translation import responses", async () => {
  for (const body of [{}, { data: null }, { data: { entries: [] } }]) {
    await withFetch(
      async () => jsonResponse(body),
      async () => {
        await assert.rejects(
          () => importTranslations({ entries: [] }),
          /Translation import could not be completed/,
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
