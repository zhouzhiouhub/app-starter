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
    GA4_MEASUREMENT_ID: "G-ABC1234567",
  });

  assert.equal(diagnostics.analytics.enabled.value, true);
  assert.equal(diagnostics.analytics.consent.value, true);
  assert.equal(diagnostics.analytics.providerConfigured, true);
  assert.equal(diagnostics.analytics.providers.GA4_MEASUREMENT_ID.issue, null);
  assert.equal(diagnostics.analytics.providers.GA4_MEASUREMENT_ID.valid, true);
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
  assert.equal(diagnostics.analytics.providers.GTM_CONTAINER_ID.issue, "too-long");
  assert.equal(diagnostics.analytics.providerConfigured, false);
  assert.equal(diagnostics.analytics.productionReady, false);
});

test("smoke environment diagnostics reports analytics provider issue reasons", () => {
  const diagnostics = createSmokeEnvironmentDiagnostics({
    ANALYTICS_CONSENT_GRANTED: "true",
    ANALYTICS_ENABLED: "true",
    CLARITY_PROJECT_ID: "clarity-123",
    GA4_MEASUREMENT_ID: "G-ABC1234567\n",
    GTM_CONTAINER_ID: " GTM-ABC1234 ",
  });

  assert.deepEqual(diagnostics.analytics.invalidProviders, [
    "CLARITY_PROJECT_ID",
    "GA4_MEASUREMENT_ID",
    "GTM_CONTAINER_ID",
  ]);
  assert.equal(
    diagnostics.analytics.providers.CLARITY_PROJECT_ID.issue,
    "invalid-format",
  );
  assert.equal(
    diagnostics.analytics.providers.GA4_MEASUREMENT_ID.issue,
    "control-character",
  );
  assert.equal(
    diagnostics.analytics.providers.GTM_CONTAINER_ID.issue,
    "surrounding-whitespace",
  );
  assert.equal(diagnostics.analytics.providerConfigured, false);
  assert.equal(diagnostics.analytics.productionReady, false);
});
