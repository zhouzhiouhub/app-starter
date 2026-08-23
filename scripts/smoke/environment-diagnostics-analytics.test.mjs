import assert from "node:assert/strict";
import test from "node:test";
import { createSmokeEnvironmentDiagnostics } from "./environment-diagnostics.mjs";

test("smoke environment diagnostics accepts disabled analytics defaults", () => {
  const diagnostics = createSmokeEnvironmentDiagnostics({});

  assert.equal(diagnostics.analytics.enabled.value, false);
  assert.equal(diagnostics.analytics.consent.value, false);
  assert.equal(diagnostics.analytics.providerConfigured, false);
  assert.equal(diagnostics.analytics.productionReady, true);
});

test("smoke environment diagnostics reports enabled analytics readiness", () => {
  const diagnostics = createSmokeEnvironmentDiagnostics({
    ANALYTICS_CONSENT_GRANTED: " true ",
    ANALYTICS_ENABLED: "yes",
    GA4_MEASUREMENT_ID: " G-ABC1234567 ",
  });

  assert.equal(diagnostics.analytics.enabled.value, true);
  assert.equal(diagnostics.analytics.consent.value, true);
  assert.equal(diagnostics.analytics.providerConfigured, true);
  assert.deepEqual(diagnostics.analytics.invalidProviders, []);
  assert.equal(diagnostics.analytics.productionReady, true);
});

test("smoke environment diagnostics blocks unsafe analytics config", () => {
  const diagnostics = createSmokeEnvironmentDiagnostics({
    ANALYTICS_CONSENT_GRANTED: "allowed",
    ANALYTICS_ENABLED: "true",
    GTM_CONTAINER_ID: `GTM-${"A".repeat(64)}`,
  });

  assert.equal(diagnostics.analytics.enabled.productionReady, true);
  assert.equal(
    diagnostics.analytics.consent.issue,
    "invalid-boolean",
  );
  assert.deepEqual(diagnostics.analytics.invalidProviders, [
    "GTM_CONTAINER_ID",
  ]);
  assert.equal(diagnostics.analytics.providerConfigured, false);
  assert.equal(diagnostics.analytics.productionReady, false);
});
