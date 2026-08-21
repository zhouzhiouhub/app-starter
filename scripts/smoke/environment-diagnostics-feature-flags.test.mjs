import assert from "node:assert/strict";
import test from "node:test";
import { createSmokeEnvironmentDiagnostics } from "./environment-diagnostics.mjs";

test("smoke environment diagnostics reports MVP feature flags explicitly disabled", () => {
  const diagnostics = createSmokeEnvironmentDiagnostics({
    COMMERCE_ENABLED: " false ",
    MULTI_LOCALE_ENABLED: "0",
  });

  assert.deepEqual(diagnostics.featureFlags, {
    configured: true,
    disabled: true,
    flags: {
      COMMERCE_ENABLED: {
        configured: true,
        disabled: true,
        issue: null,
        productionReady: true,
      },
      MULTI_LOCALE_ENABLED: {
        configured: true,
        disabled: true,
        issue: null,
        productionReady: true,
      },
    },
    productionReady: true,
  });
});

test("smoke environment diagnostics reports unsafe MVP feature flag values", () => {
  const diagnostics = createSmokeEnvironmentDiagnostics({
    COMMERCE_ENABLED: "true",
    MULTI_LOCALE_ENABLED: "disabled",
  });

  assert.equal(
    diagnostics.featureFlags.flags.COMMERCE_ENABLED.issue,
    "enabled",
  );
  assert.equal(
    diagnostics.featureFlags.flags.MULTI_LOCALE_ENABLED.issue,
    "invalid-boolean",
  );
  assert.equal(diagnostics.featureFlags.productionReady, false);
});

test("smoke environment diagnostics requires MVP feature flag env values", () => {
  const diagnostics = createSmokeEnvironmentDiagnostics({});

  assert.equal(diagnostics.featureFlags.configured, false);
  assert.equal(
    diagnostics.featureFlags.flags.COMMERCE_ENABLED.issue,
    "missing-env",
  );
  assert.equal(
    diagnostics.featureFlags.flags.MULTI_LOCALE_ENABLED.issue,
    "missing-env",
  );
});
