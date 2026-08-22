import assert from "node:assert/strict";
import test from "node:test";
import {
  readWebRuntimeDefaults,
  resolveWebLocale,
  resolveWebMarket,
} from "../src/lib/runtime-defaults.ts";

test("web runtime defaults normalize valid environment values", () => {
  const defaults = readWebRuntimeDefaults({
    DEFAULT_LOCALE: " en-US ",
    DEFAULT_MARKET: " us ",
    FALLBACK_LOCALE: " de-DE ",
  });

  assert.deepEqual(defaults, {
    defaultLocale: "en-US",
    defaultMarket: "us",
    fallbackLocale: "de-DE",
  });
});

test("web runtime defaults ignore invalid environment values", () => {
  const defaults = readWebRuntimeDefaults({
    DEFAULT_LOCALE: "bad_locale",
    DEFAULT_MARKET: "US",
    FALLBACK_LOCALE: "still_bad",
  });

  assert.deepEqual(defaults, {
    defaultLocale: "en-US",
    defaultMarket: "us",
    fallbackLocale: "en-US",
  });
});

test("web locale and market resolvers reject invalid explicit values", () => {
  const defaults = readWebRuntimeDefaults({});

  assert.equal(resolveWebLocale(undefined, defaults), "en-US");
  assert.equal(resolveWebLocale("de-DE", defaults), "de-DE");
  assert.equal(resolveWebLocale("bad_locale", defaults), null);
  assert.equal(resolveWebMarket(undefined, defaults), "us");
  assert.equal(resolveWebMarket("eu", defaults), "eu");
  assert.equal(resolveWebMarket("US", defaults), null);
});
