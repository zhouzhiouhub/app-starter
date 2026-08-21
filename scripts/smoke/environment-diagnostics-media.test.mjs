import assert from "node:assert/strict";
import test from "node:test";
import { createSmokeEnvironmentDiagnostics } from "./environment-diagnostics.mjs";

test("smoke environment diagnostics reports media readiness without secrets", () => {
  const diagnostics = createSmokeEnvironmentDiagnostics({
    ANALYTICS_CONSENT_GRANTED: "false",
    ANALYTICS_ENABLED: "false",
    MEDIA_CDN_BASE_URL: "https://cdn.brand-assets.com/media",
    MEDIA_EXTERNAL_URL_HOSTS: "images.example.com, https://assets.example.org",
    COMMERCE_ENABLED: "false",
    MULTI_LOCALE_ENABLED: "false",
    R2_ACCESS_KEY_ID: "access-key",
    R2_ACCOUNT_ID: "account-id",
    R2_BUCKET: "bucket-name",
    R2_REGION: "auto",
    R2_SECRET_ACCESS_KEY: "super-secret",
    PREVIEW_TOKEN_SECRET: "super-preview-secret",
    STOREFRONT_REVALIDATE_SECRET: "super-revalidate-secret",
    STOREFRONT_REVALIDATE_URL: "https://web.example.com/",
  });

  assert.deepEqual(diagnostics, {
    analytics: {
      consent: {
        configured: true,
        issue: null,
        productionReady: true,
        value: false,
      },
      enabled: {
        configured: true,
        issue: null,
        productionReady: true,
        value: false,
      },
      invalidProviders: [],
      productionReady: true,
      providerConfigured: false,
      providers: {
        CLARITY_PROJECT_ID: {
          configured: false,
          valid: false,
        },
        GA4_MEASUREMENT_ID: {
          configured: false,
          valid: false,
        },
        GTM_CONTAINER_ID: {
          configured: false,
          valid: false,
        },
      },
    },
    deployment: {
      admin: {
        configured: false,
        host: "localhost",
        path: "",
        productionReady: false,
        urlIssue: "local-host",
        urlSafe: false,
        variable: "ADMIN_URL",
      },
      api: {
        configured: false,
        host: "localhost",
        path: "",
        productionReady: false,
        urlIssue: "local-host",
        urlSafe: false,
        variable: "API_URL",
      },
      web: {
        configured: false,
        host: "localhost",
        path: "",
        productionReady: false,
        urlIssue: "local-host",
        urlSafe: false,
        variable: "WEB_URL",
      },
    },
    featureFlags: {
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
    },
    media: {
      cdnConfigured: true,
      cdnHost: "cdn.brand-assets.com",
      cdnProductionReady: true,
      cdnUrlIssue: null,
      cdnUrlSafe: true,
      cdnUsesLocalFallback: false,
      externalUrlHosts: ["images.example.com", "assets.example.org"],
      r2: {
        configured: true,
        missingRequired: [],
        region: "auto",
      },
    },
    preview: {
      configured: true,
      previousSecretConfigured: false,
      secretConfigured: true,
    },
    revalidation: {
      configured: true,
      endpointHost: "web.example.com",
      endpointPath: "/api/revalidate",
      requireRevalidation: true,
      secretConfigured: true,
      urlConfigured: true,
      urlIssue: null,
      urlSafe: true,
      urlSource: "STOREFRONT_REVALIDATE_URL",
      usesWebUrlFallback: false,
    },
  });

  const serialized = JSON.stringify(diagnostics);
  assert.equal(serialized.includes("super-secret"), false);
  assert.equal(serialized.includes("super-preview-secret"), false);
  assert.equal(serialized.includes("super-revalidate-secret"), false);
  assert.equal(serialized.includes("bucket-name"), false);
  assert.equal(serialized.includes("account-id"), false);
  assert.equal(serialized.includes("access-key"), false);
});

test("smoke environment diagnostics reports missing R2 and CDN fallback", () => {
  const diagnostics = createSmokeEnvironmentDiagnostics({});

  assert.deepEqual(diagnostics.media.r2.missingRequired, [
    "R2_ACCOUNT_ID",
    "R2_ACCESS_KEY_ID",
    "R2_SECRET_ACCESS_KEY",
    "R2_BUCKET",
  ]);
  assert.equal(diagnostics.media.r2.configured, false);
  assert.equal(diagnostics.media.cdnConfigured, false);
  assert.equal(diagnostics.media.cdnHost, "cdn.local.invalid");
  assert.equal(diagnostics.media.cdnProductionReady, false);
  assert.equal(diagnostics.media.cdnUrlIssue, "local-host");
  assert.equal(diagnostics.media.cdnUrlSafe, false);
  assert.equal(diagnostics.media.cdnUsesLocalFallback, true);
  assert.equal(diagnostics.analytics.productionReady, true);
  assert.equal(diagnostics.featureFlags.configured, false);
  assert.equal(diagnostics.featureFlags.productionReady, false);
  assert.deepEqual(diagnostics.preview, {
    configured: false,
    previousSecretConfigured: false,
    secretConfigured: false,
  });
  assert.deepEqual(diagnostics.revalidation, {
    configured: false,
    endpointHost: null,
    endpointPath: null,
    requireRevalidation: true,
    secretConfigured: false,
    urlConfigured: false,
    urlIssue: "missing-url",
    urlSafe: false,
    urlSource: null,
    usesWebUrlFallback: false,
  });
});

test("smoke environment diagnostics reports unsafe CDN configuration", () => {
  const withQuery = createSmokeEnvironmentDiagnostics({
    MEDIA_CDN_BASE_URL: "https://cdn.example.com/media?token=1",
  });
  const localhost = createSmokeEnvironmentDiagnostics({
    MEDIA_CDN_BASE_URL: "http://localhost:3000/media",
  });
  const privateHost = createSmokeEnvironmentDiagnostics({
    MEDIA_CDN_BASE_URL: "https://10.0.0.1/media",
  });
  const placeholderHost = createSmokeEnvironmentDiagnostics({
    MEDIA_CDN_BASE_URL: "https://cdn.example.com/media",
  });

  assert.deepEqual(
    {
      cdnHost: withQuery.media.cdnHost,
      cdnProductionReady: withQuery.media.cdnProductionReady,
      cdnUrlIssue: withQuery.media.cdnUrlIssue,
      cdnUrlSafe: withQuery.media.cdnUrlSafe,
      cdnUsesLocalFallback: withQuery.media.cdnUsesLocalFallback,
    },
    {
      cdnHost: "cdn.example.com",
      cdnProductionReady: false,
      cdnUrlIssue: "unsupported-url-parts",
      cdnUrlSafe: false,
      cdnUsesLocalFallback: false,
    },
  );
  assert.equal(localhost.media.cdnUrlIssue, "unsupported-protocol");
  assert.equal(localhost.media.cdnProductionReady, false);
  assert.equal(localhost.media.cdnUsesLocalFallback, true);
  assert.equal(privateHost.media.cdnUrlIssue, "local-host");
  assert.equal(privateHost.media.cdnProductionReady, false);
  assert.equal(privateHost.media.cdnUsesLocalFallback, true);
  assert.equal(placeholderHost.media.cdnUrlIssue, "placeholder-host");
  assert.equal(placeholderHost.media.cdnProductionReady, false);
  assert.equal(placeholderHost.media.cdnUrlSafe, false);
  assert.equal(placeholderHost.media.cdnUsesLocalFallback, false);
});
