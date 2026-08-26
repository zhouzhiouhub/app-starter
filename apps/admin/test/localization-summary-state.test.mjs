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
    translations: [],
    translationsMeta: {
      entryLimit: 2000,
      expectedKeyCount: 0,
      fallbackLocale: "en-US",
      isFallback: false,
      limit: 20,
      locale: "en-US",
      missingKeyCount: 0,
      missingKeyPreviewLimit: 50,
      missingKeys: [],
      page: 1,
      requestedLocale: "en-US",
      total: 0,
    },
  });

  assert.deepEqual(state, {
    defaultLocale: "en-US",
    defaultMarket: "us",
    fallbackLocale: "en-US",
    isFallback: false,
    marketCurrency: "USD",
    missingKeyCount: 0,
    status: "active",
    translationCount: 0,
    translationEntryLimit: 2000,
    translationLimit: 20,
    translationPage: 1,
    translationRequestedLocale: "en-US",
    translationResolvedLocale: "en-US",
    translationTotal: 0,
  });
});

test("localization summary exposes non-default translation fallback entries", () => {
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
    translations: [
      {
        context: "Homepage",
        key: "page.home.hero.title",
        locale: "en-US",
        updatedAt: "2026-08-24T00:00:00.000Z",
        value: "Build better storefronts",
      },
    ],
    translationsMeta: {
      entryLimit: 2000,
      expectedKeyCount: 2,
      fallbackLocale: "en-US",
      isFallback: true,
      limit: 20,
      locale: "en-US",
      missingKeyCount: 1,
      missingKeyPreviewLimit: 50,
      missingKeys: ["page.home.hero.body"],
      page: 1,
      requestedLocale: "de-DE",
      total: 1,
    },
  });

  assert.equal(state.defaultMarket, "us");
  assert.equal(state.defaultLocale, "en-US");
  assert.equal(state.fallbackLocale, "en-US");
  assert.equal(state.status, "fallback");
  assert.equal(state.translationCount, 1);
  assert.equal(state.translationEntryLimit, 2000);
  assert.equal(state.translationLimit, 20);
  assert.equal(state.translationPage, 1);
  assert.equal(state.translationRequestedLocale, "de-DE");
  assert.equal(state.translationResolvedLocale, "en-US");
  assert.equal(state.translationTotal, 1);
  assert.equal(state.missingKeyCount, 1);
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
    translations: [],
    translationsMeta: {
      entryLimit: 2000,
      expectedKeyCount: 0,
      fallbackLocale: "en-US",
      isFallback: true,
      limit: 20,
      locale: "en-US",
      missingKeyCount: 0,
      missingKeyPreviewLimit: 50,
      missingKeys: [],
      page: 1,
      requestedLocale: "de-DE",
      total: 0,
    },
  });

  assert.equal(state.defaultMarket, "us");
  assert.equal(state.marketCurrency, "USD");
  assert.equal(state.status, "missing");
});
