import assert from "node:assert/strict";
import test from "node:test";
import {
  readAnalyticsRuntimeConfig,
  shouldLoadAnalyticsScripts,
} from "../src/lib/analytics-config.ts";

test("web analytics config parses explicit boolean gates", () => {
  const config = readAnalyticsRuntimeConfig({
    ANALYTICS_CONSENT_GRANTED: " yes ",
    ANALYTICS_ENABLED: " TRUE ",
    GTM_CONTAINER_ID: " GTM-ABC1234 ",
  });

  assert.equal(config.enabled, true);
  assert.equal(config.consentGranted, true);
  assert.equal(config.gtmContainerId, "GTM-ABC1234");
  assert.equal(shouldLoadAnalyticsScripts(config), true);

  for (const value of ["0", "false", "FALSE", "no", "off"]) {
    assert.equal(
      readAnalyticsRuntimeConfig({
        ANALYTICS_ENABLED: value,
      }).enabled,
      false,
    );
  }
});

test("web analytics config rejects misspelled boolean gates", () => {
  assert.throws(
    () =>
      readAnalyticsRuntimeConfig({
        ANALYTICS_CONSENT_GRANTED: "false",
        ANALYTICS_ENABLED: "treu",
      }),
    /ANALYTICS_ENABLED must be true or false/,
  );
  assert.throws(
    () =>
      readAnalyticsRuntimeConfig({
        ANALYTICS_CONSENT_GRANTED: "enabled",
        ANALYTICS_ENABLED: "true",
      }),
    /ANALYTICS_CONSENT_GRANTED must be true or false/,
  );
});

test("web analytics scripts stay disabled without consent or provider", () => {
  assert.equal(
    shouldLoadAnalyticsScripts(
      readAnalyticsRuntimeConfig({
        ANALYTICS_CONSENT_GRANTED: "true",
        ANALYTICS_ENABLED: "true",
      }),
    ),
    false,
  );
  assert.equal(
    shouldLoadAnalyticsScripts(
      readAnalyticsRuntimeConfig({
        ANALYTICS_CONSENT_GRANTED: "false",
        ANALYTICS_ENABLED: "true",
        GA4_MEASUREMENT_ID: "G-ABC1234567",
      }),
    ),
    false,
  );
});

test("web analytics config ignores malformed or oversized provider ids", () => {
  const config = readAnalyticsRuntimeConfig({
    ANALYTICS_CONSENT_GRANTED: "true",
    ANALYTICS_ENABLED: "true",
    CLARITY_PROJECT_ID: "clarity-123",
    GA4_MEASUREMENT_ID: `G-${"A".repeat(64)}`,
    GTM_CONTAINER_ID: "https://tag.example.com",
  });

  assert.equal(config.clarityProjectId, null);
  assert.equal(config.ga4MeasurementId, null);
  assert.equal(config.gtmContainerId, null);
  assert.equal(shouldLoadAnalyticsScripts(config), false);
});
