import assert from "node:assert/strict";
import test from "node:test";
import { buildDashboardSummary } from "../src/features/dashboard/dashboard-summary.ts";

test("dashboard summary aggregates publish, media, localization, and audit state", () => {
  const summary = buildDashboardSummary({
    audit: {
      data: [
        auditLog(
          "audit-old",
          "page.updated",
          "page",
          "page-2",
          "2026-01-01T00:00:00.000Z",
        ),
        auditLog(
          "audit-new",
          "page.published",
          "page",
          "page-1",
          "2026-01-03T00:00:00.000Z",
        ),
      ],
      meta: { limit: 100, page: 1, total: 2 },
    },
    customRoutes: [
      {
        label: "Campaign Review",
        path: "/campaign-review",
        requiredScopes: ["pages:read"],
      },
    ],
    localization: {
      locales: [
        { code: "en-US", fallbackLocale: "en-US", status: "active" },
        { code: "de-DE", fallbackLocale: "en-US", status: "disabled" },
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
        entryLimit: 100,
        expectedKeyCount: 12,
        fallbackLocale: "en-US",
        isFallback: false,
        limit: 100,
        locale: "en-US",
        missingKeyCount: 1,
        missingKeyPreviewLimit: 10,
        missingKeys: ["hero.title"],
        page: 1,
        requestedLocale: "en-US",
        total: 11,
      },
    },
    media: {
      data: [
        mediaAsset(
          "media-old",
          "hero-old.png",
          "archived",
          "2026-01-01T00:00:00.000Z",
        ),
        mediaAsset(
          "media-new",
          "hero-new.png",
          "active",
          "2026-01-04T00:00:00.000Z",
        ),
      ],
      meta: { limit: 100, page: 1, total: 2 },
    },
    pages: {
      data: [
        page(
          "page-draft",
          "Draft page",
          "draft",
          "2026-01-02T00:00:00.000Z",
        ),
        page(
          "page-published",
          "Published page",
          "published",
          "2026-01-05T00:00:00.000Z",
        ),
      ],
      meta: { limit: 100, page: 1, total: 2 },
    },
    settings: siteSettings(),
  });

  assert.equal(summary.pages.total, 2);
  assert.equal(summary.pages.publishedCount, 1);
  assert.equal(summary.pages.unpublishedCount, 1);
  assert.equal(summary.pages.recent[0]?.id, "page-published");
  assert.deepEqual(summary.pages.statusCounts, { draft: 1, published: 1 });
  assert.equal(summary.media.activeCount, 1);
  assert.equal(summary.media.recent[0]?.id, "media-new");
  assert.equal(summary.localization.status, "missing");
  assert.equal(summary.localization.activeLocaleCount, 1);
  assert.equal(summary.audit.recent[0]?.id, "audit-new");
  assert.equal(summary.customRoutes.total, 1);
  assert.equal(summary.site.commerceEnabled, false);
});

test("dashboard summary marks partial page status coverage", () => {
  const summary = buildDashboardSummary({
    audit: { data: [], meta: { limit: 100, page: 1, total: 0 } },
    customRoutes: [],
    localization: {
      locales: [],
      markets: [],
      translations: [],
      translationsMeta: {
        entryLimit: 100,
        expectedKeyCount: 0,
        fallbackLocale: "en-US",
        isFallback: true,
        limit: 100,
        locale: "en-US",
        missingKeyCount: 0,
        missingKeyPreviewLimit: 10,
        missingKeys: [],
        page: 1,
        requestedLocale: "fr-FR",
        total: 0,
      },
    },
    media: { data: [], meta: { limit: 100, page: 1, total: 0 } },
    pages: {
      data: [
        page("page-1", "Loaded", "published", "2026-01-01T00:00:00.000Z"),
      ],
      meta: { limit: 100, page: 1, total: 2 },
    },
    settings: siteSettings(),
  });

  assert.equal(summary.pages.hasMoreStatusRows, true);
  assert.equal(summary.localization.status, "fallback");
  assert.equal(summary.localization.primaryLocale, "en-US");
  assert.equal(summary.localization.primaryMarket, "us");
});

function siteSettings() {
  return {
    analytics: {
      clarityProjectId: null,
      consentGranted: false,
      enabled: false,
      ga4MeasurementId: null,
      gtmContainerId: null,
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

function page(id, title, status, updatedAt) {
  return {
    createdAt: "2026-01-01T00:00:00.000Z",
    id,
    locale: "en-US",
    publishedVersionId: status === "published" ? `${id}-version` : null,
    siteDomain: "store.example.com",
    siteId: "site-1",
    slug: id,
    status,
    title,
    type: "landing",
    updatedAt,
  };
}

function mediaAsset(id, filename, status, createdAt) {
  return {
    archivedAt: status === "archived" ? "2026-01-02T00:00:00.000Z" : null,
    createdAt,
    filename,
    id,
    metadata: {},
    mimeType: "image/png",
    r2Key: `tenant-1/${filename}`,
    reference: `media://${id}`,
    size: 1024,
    status,
    type: "image",
    url: `https://cdn.example.com/${filename}`,
  };
}

function auditLog(id, action, targetType, targetId, createdAt) {
  return {
    action,
    actorId: "user-1",
    createdAt,
    id,
    metadata: {},
    requestId: "req-1",
    targetId,
    targetType,
  };
}
