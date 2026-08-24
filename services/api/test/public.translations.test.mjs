import assert from "node:assert/strict";
import test from "node:test";
import { PublicController } from "../dist/modules/public/public.controller.js";
import { PublicTranslationsService } from "../dist/modules/public/public-translations.service.js";
import { withEnv } from "./env-helper.mjs";

test("public translations read tenant-scoped messages", async () => {
  const queries = [];
  const service = new PublicTranslationsService(
    {
      getPublicSiteContext: async (siteHost) => {
        assert.equal(siteHost, "store.brand-platform.com");
        return {
          siteId: "site-public",
          tenantId: "tenant-public",
        };
      },
    },
    {
      translation: {
        findMany: async (query) => {
          queries.push(query);
          return [
            {
              key: "page.home.hero.title",
              value: "Build better storefronts",
            },
          ];
        },
      },
    },
  );

  const response = await service.list({
    locale: "en-US",
    requestId: "request-public-translations",
    siteHost: "store.brand-platform.com",
  });

  assert.deepEqual(queries, [
    {
      orderBy: { key: "asc" },
      where: {
        locale: "en-US",
        tenantId: "tenant-public",
      },
    },
  ]);
  assert.deepEqual(response.data, {
    locale: "en-US",
    messages: {
      "page.home.hero.title": "Build better storefronts",
    },
  });
  assert.equal(response.meta.siteId, "site-public");
  assert.equal(response.meta.tenantId, "tenant-public");
  assert.equal(response.meta.total, 1);
  assert.equal(response.meta.requestId, "request-public-translations");
});

test("public translations do not leak default tenant for unmatched hosts", async () => {
  const service = new PublicTranslationsService(
    {
      getPublicSiteContext: async () => null,
    },
    {
      translation: {
        findMany: async () => {
          throw new Error("translations must not be queried without a site.");
        },
      },
    },
  );

  const response = await service.list({
    locale: "en-US",
    requestId: "request-public-unmatched-translations",
    siteHost: "missing.brand-platform.com",
  });

  assert.deepEqual(response.data, {
    locale: "en-US",
    messages: {},
  });
  assert.equal(response.meta.siteId, null);
  assert.equal(response.meta.tenantId, null);
  assert.equal(response.meta.total, 0);
  assert.equal(response.meta.requestId, "request-public-unmatched-translations");
});

test("public translations query fallback locale while multi-locale is disabled", async () => {
  await withEnv(
    {
      DEFAULT_LOCALE: "en-US",
      MULTI_LOCALE_ENABLED: "false",
    },
    async () => {
      let queryLocale = null;
      const service = new PublicTranslationsService(
        {
          getPublicSiteContext: async () => ({
            siteId: "site-public",
            tenantId: "tenant-public",
          }),
        },
        {
          translation: {
            findMany: async (query) => {
              queryLocale = query.where.locale;
              return [];
            },
          },
        },
      );

      const response = await service.list({
        locale: "de-DE",
        requestId: "request-public-translation-fallback",
      });

      assert.equal(queryLocale, "en-US");
      assert.equal(response.meta.locale, "en-US");
      assert.equal(response.meta.isFallback, true);
    },
  );
});

test("public translations controller forwards storefront hosts", async () => {
  const controller = new PublicController(
    {},
    {
      list: async (input) => {
        assert.deepEqual(input, {
          locale: "en-US",
          requestId: "request-public-translation-host",
          siteHost: "store.brand-platform.com",
        });

        return {
          data: {
            locale: "en-US",
            messages: {},
          },
          meta: { requestId: input.requestId },
        };
      },
    },
  );

  const response = await controller.getTranslations(
    "en-US",
    "request-public-translation-host",
    { "x-storefront-host": " Store.Brand-Platform.com:443 " },
  );

  assert.equal(response.meta.requestId, "request-public-translation-host");
});
