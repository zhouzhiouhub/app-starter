import assert from "node:assert/strict";
import test from "node:test";
import { toSiteSettingsResponse } from "../dist/modules/sites/sites.mapper.js";
import { withEnv } from "./env-helper.mjs";

const site = {
  createdAt: new Date("2026-08-19T00:00:00.000Z"),
  domain: "localhost",
  id: "site-1",
  name: "Default Site",
  tenantId: "tenant-1",
};

test("site settings response includes runtime defaults and feature flags", () => {
  withEnv(
    {
      COMMERCE_ENABLED: "false",
      ANALYTICS_CONSENT_GRANTED: " FALSE ",
      ANALYTICS_ENABLED: " TRUE ",
      CLARITY_PROJECT_ID: " clarity123 ",
      DEFAULT_CURRENCY: "USD",
      DEFAULT_LOCALE: "en-US",
      DEFAULT_MARKET: "us",
      FALLBACK_LOCALE: "en-US",
      GA4_MEASUREMENT_ID: " G-ABC1234567 ",
      GTM_CONTAINER_ID: " GTM-ABC1234 ",
      MULTI_LOCALE_ENABLED: "false",
    },
    () => {
      assert.deepEqual(toSiteSettingsResponse(site), {
        analytics: {
          clarityProjectId: "clarity123",
          consentGranted: false,
          enabled: true,
          ga4MeasurementId: "G-ABC1234567",
          gtmContainerId: "GTM-ABC1234",
        },
        createdAt: "2026-08-19T00:00:00.000Z",
        defaults: {
          currency: "USD",
          fallbackLocale: "en-US",
          locale: "en-US",
          market: "us",
        },
        domain: "localhost",
        featureFlags: {
          commerceEnabled: false,
          multiLocaleEnabled: false,
        },
        id: "site-1",
        name: "Default Site",
        tenantId: "tenant-1",
      });
    },
  );
});

test("site settings response ignores invalid analytics provider ids", () => {
  withEnv(
    {
      ANALYTICS_CONSENT_GRANTED: "true",
      ANALYTICS_ENABLED: "true",
      CLARITY_PROJECT_ID: "clarity-123",
      GA4_MEASUREMENT_ID: "GA-123",
      GTM_CONTAINER_ID: "https://tag.example.com",
    },
    () => {
      assert.deepEqual(toSiteSettingsResponse(site).analytics, {
        clarityProjectId: null,
        consentGranted: true,
        enabled: true,
        ga4MeasurementId: null,
        gtmContainerId: null,
      });
    },
  );
});

test("site settings response normalizes feature flag environment values", () => {
  withEnv(
    {
      COMMERCE_ENABLED: " TRUE ",
      MULTI_LOCALE_ENABLED: " TRUE ",
    },
    () => {
      assert.deepEqual(toSiteSettingsResponse(site).featureFlags, {
        commerceEnabled: true,
        multiLocaleEnabled: true,
      });
    },
  );
});

test("site settings response rejects misspelled boolean environment values", () => {
  withEnv(
    {
      ANALYTICS_ENABLED: "treu",
    },
    () => {
      assert.throws(
        () => toSiteSettingsResponse(site),
        /ANALYTICS_ENABLED must be true or false/,
      );
    },
  );
});

test("site settings response ignores invalid runtime defaults", () => {
  withEnv(
    {
      DEFAULT_CURRENCY: "usd",
      DEFAULT_LOCALE: "bad_locale",
      DEFAULT_MARKET: "US",
      FALLBACK_LOCALE: "still_bad",
    },
    () => {
      assert.deepEqual(toSiteSettingsResponse(site).defaults, {
        currency: "USD",
        fallbackLocale: "en-US",
        locale: "en-US",
        market: "us",
      });
    },
  );
});
