import assert from "node:assert/strict";
import test from "node:test";
import { BadRequestException } from "@nestjs/common";
import {
  translationEntryMaxCount,
  translationListDefaultLimit,
} from "../../../packages/schema/dist/index.js";
import { LocalizationService } from "../dist/modules/localization/localization.service.js";

const actor = {
  email: "admin@example.com",
  id: "user-1",
  name: "Admin",
  roles: ["tenant-admin"],
  scopes: ["translation:read", "translation:write"],
  status: "active",
  tenantId: "tenant-1",
};

test("admin translations expose an empty key list for the default locale", async () => {
  const countQueries = [];
  const queries = [];
  const service = new LocalizationService({
    page: {
      findMany: async () => [],
    },
    pageVersion: {
      findMany: async () => [],
    },
    translation: {
      count: async (query) => {
        countQueries.push(query);
        return 0;
      },
      findMany: async (query) => {
        queries.push(query);
        return [];
      },
    },
  });

  const response = await service.listTranslations(
    actor,
    { locale: "en-US" },
    "request-empty-translation-keys",
  );

  assert.deepEqual(response.data, []);
  assert.deepEqual(countQueries, [
    {
      where: {
        locale: "en-US",
        tenantId: "tenant-1",
      },
    },
  ]);
  assert.deepEqual(queries, [
    {
      orderBy: { key: "asc" },
      skip: 0,
      take: translationListDefaultLimit,
      where: {
        locale: "en-US",
        tenantId: "tenant-1",
      },
    },
  ]);
  assert.equal(response.meta.entryLimit, translationEntryMaxCount);
  assert.equal(response.meta.expectedKeyCount, 0);
  assert.equal(response.meta.isFallback, false);
  assert.equal(response.meta.limit, translationListDefaultLimit);
  assert.equal(response.meta.locale, "en-US");
  assert.equal(response.meta.missingKeyCount, 0);
  assert.deepEqual(response.meta.missingKeys, []);
  assert.equal(response.meta.page, 1);
  assert.equal(response.meta.requestId, "request-empty-translation-keys");
  assert.equal(response.meta.total, 0);
});

test("admin translations filter by namespace and search query", async () => {
  const countQueries = [];
  const queries = [];
  const service = new LocalizationService({
    page: {
      findMany: async () => [],
    },
    pageVersion: {
      findMany: async () => [],
    },
    translation: {
      count: async (query) => {
        countQueries.push(query);
        return 0;
      },
      findMany: async (query) => {
        queries.push(query);
        return [];
      },
    },
  });

  const response = await service.listTranslations(
    actor,
    {
      locale: "en-US",
      namespace: "page.home",
      q: "hero",
    },
    "request-filtered-translation-keys",
  );

  assert.deepEqual(countQueries, [
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
  assert.deepEqual(queries, [
    {
      orderBy: { key: "asc" },
      skip: 0,
      take: translationListDefaultLimit,
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
  assert.equal(response.meta.namespace, "page.home");
  assert.equal(response.meta.query, "hero");
});

test("admin translations paginate default locale entries", async () => {
  const queries = [];
  const service = new LocalizationService({
    page: {
      findMany: async () => [],
    },
    pageVersion: {
      findMany: async () => [],
    },
    translation: {
      count: async () => 21,
      findMany: async (query) => {
        queries.push(query);
        return [
          {
            context: null,
            key: "page.home.hero.title",
            locale: "en-US",
            updatedAt: new Date("2026-08-26T00:00:00.000Z"),
            value: "Title",
          },
        ];
      },
    },
  });

  const response = await service.listTranslations(actor, {
    limit: "10",
    locale: "en-US",
    page: "2",
  });

  assert.equal(response.meta.page, 2);
  assert.equal(response.meta.limit, 10);
  assert.equal(response.meta.total, 21);
  assert.deepEqual(queries, [
    {
      orderBy: { key: "asc" },
      skip: 10,
      take: 10,
      where: {
        locale: "en-US",
        tenantId: "tenant-1",
      },
    },
  ]);
});

test("admin translations report page schema keys missing default entries", async () => {
  const pageQueries = [];
  const publishedVersionQueries = [];
  const storedKeyQueries = [];
  const service = new LocalizationService({
    page: {
      findMany: async (query) => {
        pageQueries.push(query);
        return [
          {
            publishedVersionId: "published-version-1",
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
        ];
      },
    },
    pageVersion: {
      findMany: async (query) => {
        publishedVersionQueries.push(query);
        return [
          {
            id: "published-version-1",
            schema: {
              chrome: {
                footer: {
                  content: {
                    copyright: { i18nKey: "chrome.footer.copyright" },
                  },
                },
              },
              sections: [
                {
                  props: {
                    label: { i18nKey: "page.home.cta.label" },
                  },
                },
              ],
            },
          },
        ];
      },
    },
    translation: {
      count: async () => 0,
      findMany: async (query) => {
        if (query.select?.key) {
          storedKeyQueries.push(query);
          return [{ key: "page.home.hero.title" }];
        }

        return [];
      },
    },
  });

  const response = await service.listTranslations(actor, { locale: "en-US" });

  assert.equal(response.meta.expectedKeyCount, 4);
  assert.equal(response.meta.missingKeyCount, 3);
  assert.deepEqual(response.meta.missingKeys, [
    "chrome.footer.copyright",
    "page.home.cta.label",
    "page.home.hero.body",
  ]);
  assert.deepEqual(pageQueries, [
    {
      select: {
        publishedVersionId: true,
        versions: {
          orderBy: { version: "desc" },
          select: {
            id: true,
            schema: true,
          },
          take: 1,
        },
      },
      where: {
        site: { tenantId: "tenant-1" },
      },
    },
  ]);
  assert.deepEqual(publishedVersionQueries, [
    {
      select: {
        id: true,
        schema: true,
      },
      where: {
        id: { in: ["published-version-1"] },
        page: {
          site: { tenantId: "tenant-1" },
        },
      },
    },
  ]);
  assert.deepEqual(storedKeyQueries, [
    {
      select: { key: true },
      where: {
        key: {
          in: [
            "chrome.footer.copyright",
            "page.home.cta.label",
            "page.home.hero.body",
            "page.home.hero.title",
          ],
        },
        locale: "en-US",
        tenantId: "tenant-1",
      },
    },
  ]);
});

test("admin translations validate namespace and search filters", async () => {
  const service = new LocalizationService({
    translation: {
      findMany: async () => {
        throw new Error("translation list should not run for invalid filters.");
      },
    },
  });

  for (const query of [
    { limit: "101", locale: "en-US" },
    { locale: "en-US", namespace: "Page.home" },
    { locale: "en-US", namespace: "page..home" },
    { locale: "en-US", page: "0" },
    { locale: "en-US", q: "hero\u0000title" },
  ]) {
    await assert.rejects(
      () => service.listTranslations(actor, query),
      (error) => error instanceof BadRequestException,
    );
  }
});
