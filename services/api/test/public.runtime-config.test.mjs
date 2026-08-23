import assert from "node:assert/strict";
import test from "node:test";
import { apiErrorCodes } from "../../../packages/schema/dist/index.js";
import { PublicController } from "../dist/modules/public/public.controller.js";
import { withEnv } from "./env-helper.mjs";

test("public config exposes MVP disabled flags", () => {
  withEnv(
    {
      COMMERCE_ENABLED: "false",
      DEFAULT_CURRENCY: "USD",
      DEFAULT_LOCALE: "en-US",
      DEFAULT_MARKET: "us",
      FALLBACK_LOCALE: "en-US",
      MULTI_LOCALE_ENABLED: "false",
    },
    () => {
      const controller = new PublicController({});
      const response = controller.getConfig("request-public-config");

      assert.equal(response.data.commerceEnabled, false);
      assert.equal(response.data.multiLocaleEnabled, false);
      assert.equal(response.data.defaultCurrency, "USD");
      assert.equal(response.data.defaultLocale, "en-US");
      assert.equal(response.data.defaultMarket, "us");
      assert.equal(response.data.fallbackLocale, "en-US");
      assert.equal(response.meta.requestId, "request-public-config");
    },
  );
});

test("public config ignores invalid runtime defaults", () => {
  withEnv(
    {
      DEFAULT_CURRENCY: "usd",
      DEFAULT_LOCALE: "bad_locale",
      DEFAULT_MARKET: "Bad-Market",
      FALLBACK_LOCALE: "still_bad",
    },
    () => {
      const controller = new PublicController({});
      const response = controller.getConfig();

      assert.equal(response.data.defaultCurrency, "USD");
      assert.equal(response.data.defaultLocale, "en-US");
      assert.equal(response.data.defaultMarket, "us");
      assert.equal(response.data.fallbackLocale, "en-US");
      assert.equal(response.meta.locale, "en-US");
      assert.equal(response.meta.market, "us");
    },
  );
});

test("public config normalizes trimmed runtime defaults", () => {
  withEnv(
    {
      DEFAULT_CURRENCY: " EUR ",
      DEFAULT_LOCALE: " de-DE ",
      DEFAULT_MARKET: " eu ",
      FALLBACK_LOCALE: " fr-FR ",
    },
    () => {
      const controller = new PublicController({});
      const response = controller.getConfig();

      assert.equal(response.data.defaultCurrency, "EUR");
      assert.equal(response.data.defaultLocale, "de-DE");
      assert.equal(response.data.defaultMarket, "eu");
      assert.equal(response.data.fallbackLocale, "fr-FR");
      assert.equal(response.meta.locale, "de-DE");
      assert.equal(response.meta.market, "eu");
    },
  );
});

test("public config normalizes feature flag environment values", () => {
  withEnv(
    {
      COMMERCE_ENABLED: " TRUE ",
      DEFAULT_LOCALE: "en-US",
      FALLBACK_LOCALE: "en-US",
      MULTI_LOCALE_ENABLED: " TRUE ",
    },
    () => {
      const controller = new PublicController({});
      const config = controller.getConfig();
      const translations = controller.getTranslations(
        "fr-FR",
        "request-public-translations",
      );

      assert.equal(config.data.commerceEnabled, true);
      assert.equal(config.data.multiLocaleEnabled, true);
      assert.equal(translations.data.locale, "fr-FR");
      assert.equal(translations.meta.isFallback, false);
      assert.equal(translations.meta.requestId, "request-public-translations");
    },
  );
});

test("public translations expose configured fallback locale metadata", () => {
  withEnv(
    {
      DEFAULT_LOCALE: "en-US",
      FALLBACK_LOCALE: "de-DE",
      MULTI_LOCALE_ENABLED: "false",
    },
    () => {
      const controller = new PublicController({});
      const response = controller.getTranslations("fr-FR");

      assert.equal(response.data.locale, "en-US");
      assert.equal(response.meta.locale, "en-US");
      assert.equal(response.meta.fallbackLocale, "de-DE");
      assert.equal(response.meta.isFallback, true);
    },
  );
});

test("public pages fall back when runtime defaults are invalid", async () => {
  await withEnv(
    {
      DEFAULT_LOCALE: "bad_locale",
      DEFAULT_MARKET: "Bad-Market",
    },
    async () => {
      const controller = new PublicController({
        listPublished(input) {
          assert.deepEqual(input, {
            locale: "en-US",
            market: "us",
            siteHost: null,
          });

          return Promise.resolve({
            data: [],
            meta: { requestId: "local-dev" },
          });
        },
      });
      const response = await controller.listPages(
        undefined,
        undefined,
        undefined,
        "request-public-pages",
      );

      assert.equal(response.meta.locale, "en-US");
      assert.equal(response.meta.market, "us");
      assert.equal(response.meta.isFallback, false);
      assert.equal(response.meta.requestId, "request-public-pages");
    },
  );
});

test("public page detail response carries the current request id", async () => {
  await withEnv(
    {
      DEFAULT_LOCALE: "en-US",
      DEFAULT_MARKET: "us",
      MULTI_LOCALE_ENABLED: "false",
    },
    async () => {
      const controller = new PublicController({
        getPublishedBySlug(slug, context) {
          assert.equal(slug, "home");
          assert.deepEqual(context, {
            locale: "en-US",
            market: "us",
            siteHost: null,
          });

          return Promise.resolve({ meta: { slug: "home" } });
        },
      });

      const response = await controller.getPage(
        "home",
        undefined,
        undefined,
        undefined,
        "request-public-page",
      );

      assert.equal(response.meta.requestId, "request-public-page");
      assert.equal(response.meta.locale, "en-US");
      assert.equal(response.meta.market, "us");
    },
  );
});

test("public page detail not found response carries the current request id", async () => {
  const controller = new PublicController({
    getPublishedBySlug() {
      return Promise.resolve(null);
    },
  });

  await assert.rejects(
    () =>
      controller.getPage(
        "missing",
        "en-US",
        "us",
        undefined,
        "request-public-page-missing",
      ),
    (error) =>
      typeof error.getStatus === "function" &&
      error.getStatus() === 404 &&
      error.getResponse()?.code === apiErrorCodes.NOT_FOUND &&
      error.getResponse()?.requestId === "request-public-page-missing",
  );
});

test("public pages pass a safe storefront host into page lookups", async () => {
  const controller = new PublicController({
    listPublished(input) {
      assert.deepEqual(input, {
        locale: "en-US",
        market: "us",
        siteHost: "store.brand-platform.com",
      });

      return Promise.resolve({
        data: [],
        meta: { requestId: "local-dev" },
      });
    },
  });

  const response = await controller.listPages(
    "en-US",
    "us",
    { "x-storefront-host": " Store.Brand-Platform.com:443 " },
    "request-public-host",
  );

  assert.equal(response.meta.requestId, "request-public-host");
});

test("public page detail preserves unsafe high-priority storefront host headers", async () => {
  const controller = new PublicController({
    getPublishedBySlug(slug, context) {
      assert.equal(slug, "home");
      assert.deepEqual(context, {
        locale: "en-US",
        market: "us",
        siteHost: "store.example.com",
      });

      return Promise.resolve({ meta: { slug: "home" } });
    },
  });

  const response = await controller.getPage(
    "home",
    "en-US",
    "us",
    {
      host: "store.brand-platform.com",
      "x-storefront-host": "store.example.com",
    },
    "request-public-host-fallback",
  );

  assert.equal(response.meta.requestId, "request-public-host-fallback");
});

test("public pages preserve duplicate storefront host headers for lookup rejection", async () => {
  const controller = new PublicController({
    listPublished(input) {
      assert.deepEqual(input, {
        locale: "en-US",
        market: "us",
        siteHost: "store-a.brand-platform.com,store-b.brand-platform.com",
      });

      return Promise.resolve({
        data: [],
        meta: { requestId: "local-dev" },
      });
    },
  });

  const response = await controller.listPages(
    "en-US",
    "us",
    {
      host: "store.brand-platform.com",
      "x-storefront-host": [
        "store-a.brand-platform.com",
        "store-b.brand-platform.com",
      ],
    },
    "request-public-duplicate-host",
  );

  assert.equal(response.meta.requestId, "request-public-duplicate-host");
});

test("public pages preserve unsafe request hosts for lookup rejection", async () => {
  const controller = new PublicController({
    listPublished(input) {
      assert.deepEqual(input, {
        locale: "en-US",
        market: "us",
        siteHost: "store.example.com",
      });

      return Promise.resolve({
        data: [],
        meta: { requestId: "local-dev" },
      });
    },
  });

  const response = await controller.listPages(
    "en-US",
    "us",
    { host: "store.example.com" },
    "request-public-unsafe-host",
  );

  assert.equal(response.meta.requestId, "request-public-unsafe-host");
});
