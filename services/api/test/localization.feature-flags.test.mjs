import assert from "node:assert/strict";
import test from "node:test";
import { apiErrorCodes } from "../../../packages/schema/dist/index.js";
import { LocalizationController } from "../dist/modules/localization/localization.controller.js";
import {
  assertApiBadRequest,
  assertApiConflict,
} from "./api-error-test-assertions.mjs";
import { withEnv } from "./env-helper.mjs";

const idempotencyKey = "7f10f6d3-02d9-4f3d-a69d-49b26ec63132";

test("locale creation rejects writes while multi-locale is disabled", () => {
  withEnv({ MULTI_LOCALE_ENABLED: "false" }, () => {
    const controller = new LocalizationController();

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
    const controller = new LocalizationController();

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

test("locale creation validates locale codes when multi-locale is enabled", () => {
  withEnv({ MULTI_LOCALE_ENABLED: " TRUE " }, () => {
    const controller = new LocalizationController();
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
    const controller = new LocalizationController();

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

test("admin locales ignore invalid default locale environment values", () => {
  withEnv(
    {
      DEFAULT_CURRENCY: "usd",
      DEFAULT_LOCALE: "bad_locale",
      DEFAULT_MARKET: "Bad-Market",
      FALLBACK_LOCALE: "still_bad",
    },
    () => {
      const controller = new LocalizationController();
      const locales = controller.getLocales("request-admin-locales");
      const markets = controller.getMarkets("request-admin-markets");
      const translations = controller.getTranslations(
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

test("admin translations expose configured fallback locale metadata", () => {
  withEnv(
    {
      DEFAULT_LOCALE: "en-US",
      FALLBACK_LOCALE: "de-DE",
      MULTI_LOCALE_ENABLED: "false",
    },
    () => {
      const controller = new LocalizationController();
      const response = controller.getTranslations("fr-FR");

      assert.equal(response.meta.locale, "en-US");
      assert.equal(response.meta.fallbackLocale, "de-DE");
      assert.equal(response.meta.isFallback, true);
    },
  );
});

test("admin translations expose default locale fallback metadata", () => {
  withEnv(
    {
      DEFAULT_LOCALE: "en-US",
      FALLBACK_LOCALE: "en-US",
      MULTI_LOCALE_ENABLED: "false",
    },
    () => {
      const controller = new LocalizationController();
      const defaultResponse = controller.getTranslations();
      const fallbackResponse = controller.getTranslations("de-DE");

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
  const controller = new LocalizationController();

  assertApiBadRequest(
    () => controller.getTranslations("bad_locale"),
    apiErrorCodes.VALIDATION_ERROR,
  );
});
