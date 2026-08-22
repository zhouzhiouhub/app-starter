import assert from "node:assert/strict";
import test from "node:test";
import { readLocalizationSummaryState } from "../src/features/localization/localization-summary-state.ts";

test("localization summary state reads the active MVP defaults", () => {
  const state = readLocalizationSummaryState({
    locales: [
      {
        code: "en-US",
        fallbackLocale: "en-US",
        status: "active",
      },
    ],
    markets: [
      {
        code: "us",
        currency: "USD",
        defaultLocale: "en-US",
        status: "active",
      },
    ],
    translationsMeta: {
      fallbackLocale: "en-US",
      isFallback: false,
      locale: "en-US",
    },
  });

  assert.deepEqual(state, {
    defaultLocale: "en-US",
    defaultMarket: "us",
    fallbackLocale: "en-US",
    isFallback: false,
    marketCurrency: "USD",
    status: "active",
  });
});

test("localization summary state surfaces fallback translation metadata", () => {
  const state = readLocalizationSummaryState({
    locales: [
      {
        code: "en-US",
        fallbackLocale: "en-US",
        status: "active",
      },
    ],
    markets: [],
    translationsMeta: {
      fallbackLocale: "en-US",
      isFallback: true,
      locale: "en-US",
    },
  });

  assert.equal(state.defaultMarket, "us");
  assert.equal(state.defaultLocale, "en-US");
  assert.equal(state.marketCurrency, "USD");
  assert.equal(state.status, "missing");
});
