import assert from "node:assert/strict";
import test from "node:test";
import { readFallbackProbeLocale } from "../src/features/localization/localization-fallback-probe.ts";
import { readLocalizationSummaryState } from "../src/features/localization/localization-summary-state.ts";

test("localization fallback probe avoids the default locale", () => {
  assert.equal(readFallbackProbeLocale("en-US"), "de-DE");
  assert.equal(readFallbackProbeLocale(" de-DE "), "fr-FR");
});

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
      requestedLocale: "en-US",
    },
  });

  assert.deepEqual(state, {
    defaultLocale: "en-US",
    defaultMarket: "us",
    fallbackLocale: "en-US",
    isFallback: false,
    marketCurrency: "USD",
    status: "active",
    translationRequestedLocale: "en-US",
    translationResolvedLocale: "en-US",
  });
});

test("localization summary exposes non-default translation fallback", () => {
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
      isFallback: true,
      locale: "en-US",
      requestedLocale: "de-DE",
    },
  });

  assert.equal(state.defaultMarket, "us");
  assert.equal(state.defaultLocale, "en-US");
  assert.equal(state.fallbackLocale, "en-US");
  assert.equal(state.status, "fallback");
  assert.equal(state.translationRequestedLocale, "de-DE");
  assert.equal(state.translationResolvedLocale, "en-US");
});

test("localization summary state marks missing market data", () => {
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
      requestedLocale: "de-DE",
    },
  });

  assert.equal(state.defaultMarket, "us");
  assert.equal(state.marketCurrency, "USD");
  assert.equal(state.status, "missing");
});
