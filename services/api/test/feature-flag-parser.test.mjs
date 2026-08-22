import assert from "node:assert/strict";
import test from "node:test";
import {
  readApiFeatureFlags,
  readBooleanEnv,
} from "../dist/common/feature-flags.js";

test("API boolean environment flags parse explicit values only", () => {
  for (const value of ["1", "true", "TRUE", "yes", "on"]) {
    assert.equal(readBooleanEnv("COMMERCE_ENABLED", value), true);
  }

  for (const value of ["0", "false", "FALSE", "no", "off"]) {
    assert.equal(readBooleanEnv("COMMERCE_ENABLED", value), false);
  }

  assert.equal(readBooleanEnv("COMMERCE_ENABLED", undefined), false);
  assert.throws(
    () => readBooleanEnv("COMMERCE_ENABLED", "treu"),
    /COMMERCE_ENABLED must be true or false/,
  );
});

test("API feature flags default to disabled when unset", () => {
  assert.deepEqual(readApiFeatureFlags({}), {
    commerceEnabled: false,
    multiLocaleEnabled: false,
  });
});

test("API feature flags reject misspelled environment values", () => {
  assert.throws(
    () =>
      readApiFeatureFlags({
        COMMERCE_ENABLED: "flase",
        MULTI_LOCALE_ENABLED: "false",
      }),
    /COMMERCE_ENABLED must be true or false/,
  );
  assert.throws(
    () =>
      readApiFeatureFlags({
        COMMERCE_ENABLED: "false",
        MULTI_LOCALE_ENABLED: "enabled",
      }),
    /MULTI_LOCALE_ENABLED must be true or false/,
  );
});
