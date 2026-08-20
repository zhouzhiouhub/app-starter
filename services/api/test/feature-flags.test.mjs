import assert from "node:assert/strict";
import test from "node:test";
import { apiErrorCodes } from "../../../packages/schema/dist/index.js";
import { CommerceController } from "../dist/modules/commerce/commerce.controller.js";
import { LocalizationController } from "../dist/modules/localization/localization.controller.js";
import { PublicController } from "../dist/modules/public/public.controller.js";

const idempotencyKey = "7f10f6d3-02d9-4f3d-a69d-49b26ec63132";

test("commerce endpoints reject writes while commerce is disabled", () => {
  withEnv({ COMMERCE_ENABLED: "false" }, () => {
    const controller = new CommerceController();

    assertApiConflict(
      () => controller.addToCart(),
      apiErrorCodes.COMMERCE_DISABLED,
    );
    assertApiConflict(
      () => controller.checkout(),
      apiErrorCodes.COMMERCE_DISABLED,
    );
  });
});

test("locale creation rejects writes while multi-locale is disabled", () => {
  withEnv({ MULTI_LOCALE_ENABLED: "false" }, () => {
    const controller = new LocalizationController();

    assertApiConflict(
      () => controller.createLocale({ code: "de-DE" }),
      apiErrorCodes.MULTI_LOCALE_DISABLED,
    );
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

    assert.equal(
      controller.createLocale({ code: "de-DE" }, idempotencyKey).data.code,
      "de-DE",
    );
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
      const locales = controller.getLocales();
      const markets = controller.getMarkets();
      const translations = controller.getTranslations();

      assert.equal(locales.data[0].code, "en-US");
      assert.equal(locales.data[0].fallbackLocale, "en-US");
      assert.equal(markets.data[0].code, "us");
      assert.equal(markets.data[0].currency, "USD");
      assert.equal(markets.data[0].defaultLocale, "en-US");
      assert.equal(translations.meta.locale, "en-US");
      assert.equal(translations.meta.fallbackLocale, "en-US");
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
      const response = controller.getConfig();

      assert.equal(response.data.commerceEnabled, false);
      assert.equal(response.data.multiLocaleEnabled, false);
      assert.equal(response.data.defaultCurrency, "USD");
      assert.equal(response.data.defaultLocale, "en-US");
      assert.equal(response.data.defaultMarket, "us");
      assert.equal(response.data.fallbackLocale, "en-US");
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
      const translations = controller.getTranslations("fr-FR");

      assert.equal(config.data.commerceEnabled, true);
      assert.equal(config.data.multiLocaleEnabled, true);
      assert.equal(translations.data.locale, "fr-FR");
      assert.equal(translations.meta.isFallback, false);
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
          });

          return Promise.resolve({
            data: [],
            meta: { requestId: "local-dev" },
          });
        },
      });
      const response = await controller.listPages();

      assert.equal(response.meta.locale, "en-US");
      assert.equal(response.meta.market, "us");
      assert.equal(response.meta.isFallback, false);
    },
  );
});

function assertApiBadRequest(fn, expectedCode) {
  assert.throws(
    fn,
    (error) =>
      typeof error.getStatus === "function" &&
      error.getStatus() === 400 &&
      error.getResponse()?.code === expectedCode,
  );
}

function assertApiConflict(fn, expectedCode) {
  assert.throws(
    fn,
    (error) =>
      typeof error.getStatus === "function" &&
      error.getStatus() === 409 &&
      error.getResponse()?.code === expectedCode,
  );
}

function withEnv(values, fn) {
  const previous = Object.fromEntries(
    Object.keys(values).map((key) => [key, process.env[key]]),
  );

  for (const [key, value] of Object.entries(values)) {
    process.env[key] = value;
  }

  try {
    const result = fn();

    if (result && typeof result.finally === "function") {
      return result.finally(() => restoreEnv(previous));
    }

    restoreEnv(previous);
    return result;
  } catch (error) {
    restoreEnv(previous);
    throw error;
  }
}

function restoreEnv(previous) {
  for (const [key, value] of Object.entries(previous)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}
