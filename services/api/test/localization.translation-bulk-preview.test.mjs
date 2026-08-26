import assert from "node:assert/strict";
import test from "node:test";
import { BadRequestException } from "@nestjs/common";
import {
  apiErrorCodes,
  translationBulkPreviewMaxEntries,
  translationExportPreviewKeyMaxCount,
} from "../../../packages/schema/dist/index.js";
import { LocalizationController } from "../dist/modules/localization/localization.controller.js";
import { LocalizationService } from "../dist/modules/localization/localization.service.js";
import { withEnv } from "./env-helper.mjs";

const actor = {
  email: "admin@example.com",
  id: "user-1",
  name: "Admin",
  roles: ["tenant-admin"],
  scopes: ["translation:read", "translation:write"],
  status: "active",
  tenantId: "tenant-1",
};

test("translation import preview reports creates updates duplicates and invalid rows", async () => {
  await withEnv(
    { DEFAULT_LOCALE: "en-US", MULTI_LOCALE_ENABLED: "false" },
    async () => {
      const storedKeyQueries = [];
      const service = new LocalizationService({
        translation: {
          findMany: async (query) => {
            storedKeyQueries.push(query);
            return [{ key: "page.home.hero.title", locale: "en-US" }];
          },
        },
      });

      const response = await service.previewTranslationImport(
        {
          entries: [
            {
              key: "page.home.hero.title",
              locale: "en-US",
              value: "Updated title",
            },
            {
              key: "page.home.hero.body",
              value: "New body",
            },
            {
              key: "page.home.hero.body",
              value: "Duplicate body",
            },
            {
              key: "Page.home.hero.eyebrow",
              value: "Bad key",
            },
            {
              key: "page.home.hero.subtitle",
              locale: "de-DE",
              value: "Untertitel",
            },
            null,
          ],
        },
        actor,
        "request-import-preview",
      );

      assert.deepEqual(storedKeyQueries, [
        {
          select: { key: true, locale: true },
          where: {
            OR: [
              {
                key: "page.home.hero.title",
                locale: "en-US",
                tenantId: "tenant-1",
              },
              {
                key: "page.home.hero.body",
                locale: "en-US",
                tenantId: "tenant-1",
              },
            ],
          },
        },
      ]);
      assert.deepEqual(
        response.data.entries.map((entry) => ({
          action: entry.action,
          code: entry.issues[0]?.code,
          field: entry.issues[0]?.field,
          index: entry.index,
          key: entry.key,
          locale: entry.locale,
        })),
        [
          {
            action: "update",
            code: undefined,
            field: undefined,
            index: 0,
            key: "page.home.hero.title",
            locale: "en-US",
          },
          {
            action: "create",
            code: undefined,
            field: undefined,
            index: 1,
            key: "page.home.hero.body",
            locale: "en-US",
          },
          {
            action: "duplicate",
            code: "DUPLICATE_TRANSLATION_KEY",
            field: "key",
            index: 2,
            key: "page.home.hero.body",
            locale: "en-US",
          },
          {
            action: "error",
            code: apiErrorCodes.VALIDATION_ERROR,
            field: "key",
            index: 3,
            key: undefined,
            locale: undefined,
          },
          {
            action: "blocked",
            code: apiErrorCodes.MULTI_LOCALE_DISABLED,
            field: "locale",
            index: 4,
            key: "page.home.hero.subtitle",
            locale: "de-DE",
          },
          {
            action: "error",
            code: apiErrorCodes.VALIDATION_ERROR,
            field: undefined,
            index: 5,
            key: undefined,
            locale: undefined,
          },
        ],
      );
      assert.deepEqual(response.data.summary, {
        blockedCount: 1,
        createCount: 1,
        duplicateCount: 1,
        errorCount: 2,
        totalEntries: 6,
        updateCount: 1,
      });
      assert.equal(response.meta.preview, true);
      assert.equal(response.meta.defaultLocale, "en-US");
      assert.equal(response.meta.requestId, "request-import-preview");
      assert.equal(response.meta.tenantId, "tenant-1");
    },
  );
});

test("translation import preview validates the envelope without echoing values", async () => {
  const controller = new LocalizationController(
    new LocalizationService({
      translation: {
        findMany: async () => {
          throw new Error("translation lookup should not run.");
        },
      },
    }),
  );

  await assert.rejects(
    () =>
      controller.previewTranslationImport(
        actor,
        {
          entries: Array.from(
            { length: translationBulkPreviewMaxEntries + 1 },
            () => ({ key: "page.home.hero.title", value: "Title" }),
          ),
        },
        "request-import-too-large",
      ),
    (error) =>
      error instanceof BadRequestException &&
      error.getResponse()?.code === apiErrorCodes.VALIDATION_ERROR &&
      !error.getResponse()?.message.includes("Title"),
  );
});

test("translation export preview reports filtered default locale readiness", async () => {
  const queries = [];
  const service = new LocalizationService({
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
      count: async (query) => {
        queries.push(["count", query]);
        return 2;
      },
      findMany: async (query) => {
        queries.push(["findMany", query]);

        if (query.take === translationExportPreviewKeyMaxCount) {
          return [
            { key: "page.home.hero.body" },
            { key: "page.home.hero.title" },
          ];
        }

        return [{ key: "page.home.hero.title" }];
      },
    },
  });

  const response = await service.previewTranslationExport(
    {
      locale: "de-DE",
      namespace: "page.home",
      q: "hero",
    },
    actor,
    "request-export-preview",
  );

  assert.equal(response.data.exportableEntryCount, 2);
  assert.equal(
    response.data.sampleKeyLimit,
    translationExportPreviewKeyMaxCount,
  );
  assert.deepEqual(response.data.sampleKeys, [
    "page.home.hero.body",
    "page.home.hero.title",
  ]);
  assert.equal(response.data.expectedKeyCount, 2);
  assert.equal(response.data.missingKeyCount, 1);
  assert.deepEqual(response.data.missingKeys, ["page.home.hero.body"]);
  assert.equal(response.meta.locale, "en-US");
  assert.equal(response.meta.isFallback, true);
  assert.equal(response.meta.namespace, "page.home");
  assert.equal(response.meta.query, "hero");
  assert.deepEqual(queries[0], [
    "count",
    {
      where: {
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
      },
    },
  ]);
});
