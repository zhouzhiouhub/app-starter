import assert from "node:assert/strict";
import test from "node:test";
import {
  apiErrorCodes,
  translationEntryMaxCount,
} from "../../../packages/schema/dist/index.js";
import { LocalizationController } from "../dist/modules/localization/localization.controller.js";
import { LocalizationService } from "../dist/modules/localization/localization.service.js";
import { withEnv } from "./env-helper.mjs";
import { assertApiConflictRejects } from "./pages-test-helpers.mjs";

const actor = {
  email: "admin@example.com",
  id: "user-1",
  name: "Admin",
  roles: ["tenant-admin"],
  scopes: ["translation:read", "translation:write"],
  status: "active",
  tenantId: "tenant-1",
};

test("translation export returns filtered default locale entries", async () => {
  await withEnv(
    { DEFAULT_LOCALE: "en-US", MULTI_LOCALE_ENABLED: "false" },
    async () => {
      const auditCalls = [];
      const exportQueries = [];
      const storedKeyQueries = [];
      const service = new LocalizationService({
        auditLog: {
          create: async (query) => auditCalls.push(query),
        },
        page: {
          findMany: async () => [
            {
              publishedVersionId: null,
              versions: [
                {
                  id: "latest-version-1",
                  schema: {
                    sections: [
                      {
                        props: {
                          body: { i18nKey: "page.home.hero.body" },
                          title: { i18nKey: "page.home.hero.title" },
                        },
                      },
                    ],
                  },
                },
              ],
            },
          ],
        },
        pageVersion: {
          findMany: async () => [],
        },
        translation: {
          findMany: async (query) => {
            if (query.select?.key) {
              storedKeyQueries.push(query);
              return [{ key: "page.home.hero.title" }];
            }

            exportQueries.push(query);
            return [
              {
                context: "Homepage hero",
                key: "page.home.hero.title",
                locale: "en-US",
                updatedAt: new Date("2026-08-27T00:00:00.000Z"),
                value: "Build better storefronts",
              },
            ];
          },
        },
      });

      const response = await service.exportTranslations(
        {
          locale: "de-DE",
          namespace: "page.home",
          q: "hero",
        },
        actor,
        "request-translation-export",
      );

      assert.deepEqual(exportQueries, [
        {
          orderBy: { key: "asc" },
          take: translationEntryMaxCount + 1,
          where: filteredDefaultLocaleWhere(),
        },
      ]);
      assert.deepEqual(storedKeyQueries, [
        {
          select: { key: true },
          where: {
            key: {
              in: ["page.home.hero.body", "page.home.hero.title"],
            },
            locale: "en-US",
            tenantId: "tenant-1",
          },
        },
      ]);
      assert.deepEqual(response.data.entries, [
        {
          context: "Homepage hero",
          key: "page.home.hero.title",
          locale: "en-US",
          updatedAt: "2026-08-27T00:00:00.000Z",
          value: "Build better storefronts",
        },
      ]);
      assert.equal(response.data.contentType, "application/json");
      assert.equal(response.data.entryCount, 1);
      assert.equal(response.data.exportVersion, "translation-export.v1");
      assert.equal(response.data.filename, "translations-en-US.json");
      assert.equal(response.data.format, "json");
      assert.equal(response.data.expectedKeyCount, 2);
      assert.equal(response.data.missingKeyCount, 1);
      assert.deepEqual(response.data.missingKeys, ["page.home.hero.body"]);
      assert.equal(response.meta.locale, "en-US");
      assert.equal(response.meta.isFallback, true);
      assert.equal(response.meta.requestId, "request-translation-export");
      assert.deepEqual(auditCalls, [
        {
          data: {
            action: "translation.exported",
            actorId: "user-1",
            metadata: {
              entryCount: 1,
              expectedKeyCount: 2,
              isFallback: true,
              locale: "en-US",
              missingKeyCount: 1,
              namespace: "page.home",
              query: "hero",
            },
            requestId: "request-translation-export",
            targetId: "en-US",
            targetType: "translation-export",
            tenantId: "tenant-1",
          },
        },
      ]);
      assert.equal(JSON.stringify(auditCalls).includes("Build better"), false);
    },
  );
});

test("translation export rejects oversized result sets before audit logging", async () => {
  const auditCalls = [];
  const service = new LocalizationService({
    auditLog: {
      create: async (query) => auditCalls.push(query),
    },
    page: {
      findMany: async () => [],
    },
    pageVersion: {
      findMany: async () => [],
    },
    translation: {
      findMany: async () =>
        Array.from({ length: translationEntryMaxCount + 1 }, (_, index) => ({
          context: null,
          key: `page.home.item-${index}.title`,
          locale: "en-US",
          updatedAt: new Date("2026-08-27T00:00:00.000Z"),
          value: "Title",
        })),
    },
  });

  const error = await assertApiConflictRejects(
    () => service.exportTranslations({ locale: "en-US" }, actor),
    apiErrorCodes.CONFLICT,
  );

  assert.match(error.getResponse()?.message, /limited/);
  assert.deepEqual(auditCalls, []);
});

test("translation export controller forwards body actor and request id", async () => {
  const calls = [];
  const controller = new LocalizationController({
    exportTranslations: async (body, currentActor, requestId) => {
      calls.push({ body, currentActor, requestId });
      return { data: { entries: [] } };
    },
  });

  const response = await controller.createTranslationExport(
    actor,
    { locale: "en-US" },
    "request-controller-export",
  );

  assert.deepEqual(response, { data: { entries: [] } });
  assert.deepEqual(calls, [
    {
      body: { locale: "en-US" },
      currentActor: actor,
      requestId: "request-controller-export",
    },
  ]);
});

function filteredDefaultLocaleWhere() {
  return {
    AND: [
      {
        OR: [{ key: "page.home" }, { key: { startsWith: "page.home." } }],
      },
      {
        OR: [
          { key: { contains: "hero" } },
          { value: { contains: "hero" } },
          { context: { contains: "hero" } },
        ],
      },
    ],
    locale: "en-US",
    tenantId: "tenant-1",
  };
}
