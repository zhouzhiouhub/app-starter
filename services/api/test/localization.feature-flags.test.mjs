import assert from "node:assert/strict";
import test from "node:test";
import {
  apiErrorCodes,
  translationEntryMaxCount,
  translationListDefaultLimit,
} from "../../../packages/schema/dist/index.js";
import { LocalizationController } from "../dist/modules/localization/localization.controller.js";
import { LocalizationService } from "../dist/modules/localization/localization.service.js";
import {
  assertApiBadRequest,
  assertApiConflict,
} from "./api-error-test-assertions.mjs";
import { withEnv } from "./env-helper.mjs";

const idempotencyKey = "7f10f6d3-02d9-4f3d-a69d-49b26ec63132";
const actor = {
  email: "admin@example.com",
  id: "user-1",
  name: "Admin",
  roles: ["tenant-admin"],
  scopes: ["translation:read"],
  status: "active",
  tenantId: "tenant-1",
};

test("locale creation rejects writes while multi-locale is disabled", () => {
  withEnv({ MULTI_LOCALE_ENABLED: "false" }, () => {
    const controller = createController();

    const error = assertApiConflict(
      () =>
        controller.createLocale(
          { code: "de-DE" },
          undefined,
          "request-locale-disabled",
        ),
      apiErrorCodes.MULTI_LOCALE_DISABLED,
    );

    assert.equal(error.getResponse()?.requestId, "request-locale-disabled");
  });
});

test("locale creation does not echo disabled invalid locale input", () => {
  withEnv({ MULTI_LOCALE_ENABLED: "false" }, () => {
    const controller = createController();

    assert.throws(
      () => controller.createLocale({ code: "<script>alert(1)</script>" }),
      (error) =>
        typeof error.getStatus === "function" &&
        error.getStatus() === 409 &&
        error.getResponse()?.code === apiErrorCodes.MULTI_LOCALE_DISABLED &&
        !error.getResponse()?.message.includes("<script>"),
    );
  });
});

test("locale update rejects writes while multi-locale is disabled", () => {
  withEnv({ MULTI_LOCALE_ENABLED: "false" }, () => {
    const controller = createController();

    const error = assertApiConflict(
      () =>
        controller.updateLocale(
          "<script>alert(1)</script>",
          "request-locale-update-disabled",
        ),
      apiErrorCodes.MULTI_LOCALE_DISABLED,
    );

    assert.equal(
      error.getResponse()?.requestId,
      "request-locale-update-disabled",
    );
    assert.equal(error.getResponse()?.message.includes("<script>"), false);
  });
});

test("locale creation validates locale codes when multi-locale is enabled", () => {
  withEnv({ MULTI_LOCALE_ENABLED: " TRUE " }, () => {
    const controller = createController();
    const created = controller.createLocale(
      { code: "de-DE" },
      idempotencyKey,
      "request-locale-create",
    );

    assert.equal(created.data.code, "de-DE");
    assert.equal(created.meta.requestId, "request-locale-create");
    assert.equal(
      controller.createLocale({ data: { code: "fr-FR" } }, idempotencyKey).data
        .code,
      "fr-FR",
    );
    assertApiBadRequest(
      () => controller.createLocale({ code: "bad_locale" }, idempotencyKey),
      apiErrorCodes.VALIDATION_ERROR,
    );
  });
});

test("locale creation requires idempotency keys when multi-locale is enabled", () => {
  withEnv({ MULTI_LOCALE_ENABLED: " TRUE " }, () => {
    const controller = createController();

    assertApiBadRequest(
      () => controller.createLocale({ code: "de-DE" }),
      apiErrorCodes.VALIDATION_ERROR,
    );
    assertApiBadRequest(
      () => controller.createLocale({ code: "de-DE" }, "retry-me"),
      apiErrorCodes.VALIDATION_ERROR,
    );
  });
});

test("locale update requires idempotency and remains reserved when enabled", () => {
  withEnv({ MULTI_LOCALE_ENABLED: " TRUE " }, () => {
    const controller = createController();

    assertApiBadRequest(
      () => controller.updateLocale(undefined, "request-locale-update-missing"),
      apiErrorCodes.VALIDATION_ERROR,
    );
    const error = assertApiConflict(
      () =>
        controller.updateLocale(
          idempotencyKey,
          "request-locale-update-reserved",
        ),
      apiErrorCodes.CONFLICT,
    );

    assert.equal(
      error.getResponse()?.requestId,
      "request-locale-update-reserved",
    );
    assert.match(error.getResponse()?.message, /reserved/);
  });
});

test("admin locales ignore invalid default locale environment values", async () => {
  await withEnv(
    {
      DEFAULT_CURRENCY: "usd",
      DEFAULT_LOCALE: "bad_locale",
      DEFAULT_MARKET: "Bad-Market",
      FALLBACK_LOCALE: "still_bad",
    },
    async () => {
      const controller = createController();
      const locales = controller.getLocales("request-admin-locales");
      const markets = controller.getMarkets("request-admin-markets");
      const translations = await controller.getTranslations(
        actor,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        "request-admin-translations",
      );

      assert.equal(locales.data[0].code, "en-US");
      assert.equal(locales.data[0].fallbackLocale, "en-US");
      assert.equal(markets.data[0].code, "us");
      assert.equal(markets.data[0].currency, "USD");
      assert.equal(markets.data[0].defaultLocale, "en-US");
      assert.equal(translations.meta.locale, "en-US");
      assert.equal(translations.meta.fallbackLocale, "en-US");
      assert.equal(locales.meta.requestId, "request-admin-locales");
      assert.equal(markets.meta.requestId, "request-admin-markets");
      assert.equal(translations.meta.requestId, "request-admin-translations");
    },
  );
});

test("admin translations expose configured fallback locale metadata", async () => {
  await withEnv(
    {
      DEFAULT_LOCALE: "en-US",
      FALLBACK_LOCALE: "de-DE",
      MULTI_LOCALE_ENABLED: "false",
    },
    async () => {
      const controller = createController();
      const response = await controller.getTranslations(
        actor,
        "fr-FR",
        undefined,
        undefined,
      );

      assert.equal(response.meta.locale, "en-US");
      assert.equal(response.meta.fallbackLocale, "de-DE");
      assert.equal(response.meta.isFallback, true);
    },
  );
});

test("admin translations expose default locale fallback metadata", async () => {
  await withEnv(
    {
      DEFAULT_LOCALE: "en-US",
      FALLBACK_LOCALE: "en-US",
      MULTI_LOCALE_ENABLED: "false",
    },
    async () => {
      const controller = createController();
      const defaultResponse = await controller.getTranslations(actor);
      const fallbackResponse = await controller.getTranslations(
        actor,
        "de-DE",
        undefined,
        undefined,
      );

      assert.equal(defaultResponse.meta.locale, "en-US");
      assert.equal(defaultResponse.meta.fallbackLocale, "en-US");
      assert.equal(defaultResponse.meta.isFallback, false);
      assert.equal(fallbackResponse.meta.locale, "en-US");
      assert.equal(fallbackResponse.meta.fallbackLocale, "en-US");
      assert.equal(fallbackResponse.meta.isFallback, true);
    },
  );
});

test("admin translations reject invalid locale format", () => {
  const controller = createController();

  return assert.rejects(
    () => controller.getTranslations(actor, "bad_locale", undefined, undefined),
    (error) =>
      error.getStatus?.() === 400 &&
      error.getResponse?.().code === apiErrorCodes.VALIDATION_ERROR,
  );
});

test("admin translations read tenant-scoped stored entries", async () => {
  const countQueries = [];
  const queries = [];
  const service = createService({
    page: {
      findMany: async () => [],
    },
    pageVersion: {
      findMany: async () => [],
    },
    translation: {
      count: async (query) => {
        countQueries.push(query);
        return 1;
      },
      findMany: async (query) => {
        queries.push(query);
        return [
          {
            context: "Homepage",
            key: "page.home.hero.title",
            locale: "en-US",
            updatedAt: new Date("2026-08-24T00:00:00.000Z"),
            value: "Build better storefronts",
          },
        ];
      },
    },
  });

  const response = await service.listTranslations(
    actor,
    { locale: "en-US" },
    "request-translations-list",
  );

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
  assert.deepEqual(response.data, [
    {
      context: "Homepage",
      key: "page.home.hero.title",
      locale: "en-US",
      updatedAt: "2026-08-24T00:00:00.000Z",
      value: "Build better storefronts",
    },
  ]);
  assert.equal(response.meta.tenantId, "tenant-1");
  assert.equal(response.meta.entryLimit, translationEntryMaxCount);
  assert.equal(response.meta.total, 1);
  assert.equal(response.meta.page, 1);
  assert.equal(response.meta.limit, translationListDefaultLimit);
  assert.equal(response.meta.requestId, "request-translations-list");
});

test("admin translations query the fallback default locale while disabled", async () => {
  await withEnv(
    {
      DEFAULT_LOCALE: "en-US",
      MULTI_LOCALE_ENABLED: "false",
    },
    async () => {
      let queryLocale = null;
      const service = createService({
        page: {
          findMany: async () => [],
        },
        pageVersion: {
          findMany: async () => [],
        },
        translation: {
          count: async () => 0,
          findMany: async (query) => {
            queryLocale = query.where.locale;
            return [];
          },
        },
      });

      const response = await service.listTranslations(actor, {
        locale: "de-DE",
      });

      assert.equal(queryLocale, "en-US");
      assert.equal(response.meta.locale, "en-US");
      assert.equal(response.meta.isFallback, true);
    },
  );
});

function createController(prisma = createEmptyPrisma()) {
  return new LocalizationController(createService(prisma));
}

function createService(prisma) {
  return new LocalizationService(prisma);
}

function createEmptyPrisma() {
  return {
    page: {
      findMany: async () => [],
    },
    pageVersion: {
      findMany: async () => [],
    },
    translation: {
      count: async () => 0,
      findMany: async () => [],
    },
  };
}
