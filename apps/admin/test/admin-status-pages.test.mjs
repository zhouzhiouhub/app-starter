import assert from "node:assert/strict";
import test from "node:test";
import { buildAnalyticsSettingsSummary } from "../src/features/analytics/analytics-settings-summary.ts";
import { readDesignSystemSummary } from "../src/features/design-system/design-system-summary.ts";
import { buildUserAccessSummary } from "../src/features/users/user-access-summary.ts";

test("design system summary exposes MVP components and compiled tokens", () => {
  const summary = readDesignSystemSummary();

  assert.deepEqual(summary.componentIds, [
    "hero-banner",
    "rich-text",
    "cta-bar",
    "faq",
    "image-gallery",
    "spec-table",
  ]);
  assert.equal(summary.componentCount, 6);
  assert.equal(summary.tokenCount, 14);
  assert.equal(summary.cssVariableCount, 14);
  assert.equal(summary.cssVariableNames.includes("--color-primary"), true);
  assert.equal(summary.cssVariableNames.includes("--font-family"), true);
});

test("analytics summary reports provider and consent configuration", () => {
  const summary = buildAnalyticsSettingsSummary(
    siteSettings({
      analytics: {
        clarityProjectId: null,
        consentGranted: false,
        enabled: true,
        ga4MeasurementId: "G-123",
        gtmContainerId: "GTM-123",
      },
    }),
  );

  assert.equal(summary.enabled, true);
  assert.equal(summary.consentGranted, false);
  assert.equal(summary.configuredProviderCount, 2);
  assert.deepEqual(
    summary.providers.map((provider) => [
      provider.key,
      provider.configured,
    ]),
    [
      ["gtm", true],
      ["ga4", true],
      ["clarity", false],
    ],
  );
  assert.equal(summary.market, "us");
  assert.equal(summary.locale, "en-US");
});

test("user access summary sorts roles and groups permission scopes", () => {
  const summary = buildUserAccessSummary({
    email: "operator@example.com",
    id: "user-1",
    name: "Operator",
    roles: ["tenant-admin", "publisher"],
    scopes: [
      "pages:write",
      "audit:read",
      "pages:read",
      "settings:read",
      "media:write",
    ],
    tenantId: "tenant-1",
  });

  assert.equal(summary.displayName, "Operator");
  assert.deepEqual(summary.roles, ["publisher", "tenant-admin"]);
  assert.equal(summary.roleCount, 2);
  assert.equal(summary.scopeCount, 5);
  assert.deepEqual(
    summary.scopeGroups.map((group) => [group.name, group.scopes]),
    [
      ["audit", ["audit:read"]],
      ["media", ["media:write"]],
      ["pages", ["pages:read", "pages:write"]],
      ["settings", ["settings:read"]],
    ],
  );
});

test("user access summary falls back to email when name is blank", () => {
  const summary = buildUserAccessSummary({
    email: "publisher@example.com",
    id: "user-2",
    name: "  ",
    roles: [],
    scopes: ["read"],
    tenantId: "tenant-1",
  });

  assert.equal(summary.displayName, "publisher@example.com");
  assert.deepEqual(summary.scopeGroups, [
    {
      name: "general",
      scopes: ["read"],
    },
  ]);
});

function siteSettings(overrides = {}) {
  return {
    analytics: {
      clarityProjectId: null,
      consentGranted: false,
      enabled: false,
      ga4MeasurementId: null,
      gtmContainerId: null,
      ...overrides.analytics,
    },
    createdAt: "2026-01-01T00:00:00.000Z",
    defaults: {
      currency: "USD",
      fallbackLocale: "en-US",
      locale: "en-US",
      market: "us",
    },
    domain: "store.example.com",
    featureFlags: {
      commerceEnabled: false,
      multiLocaleEnabled: false,
    },
    id: "site-1",
    name: "Brand Platform",
    tenantId: "tenant-1",
  };
}
