import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import test from "node:test";
import { createSmokeEnvironmentDiagnostics } from "./environment-diagnostics.mjs";

test("smoke environment diagnostics reports media readiness without secrets", () => {
  const pair = createRsaPemPair();
  const diagnostics = createSmokeEnvironmentDiagnostics({
    ANALYTICS_CONSENT_GRANTED: "false",
    ANALYTICS_ENABLED: "false",
    DATABASE_URL:
      "postgresql://db-user:db-secret@db.brand-platform.com:5432/app?sslmode=require",
    JWT_PRIVATE_KEY: pair.privateKey.replaceAll("\n", "\\n"),
    JWT_PUBLIC_KEY: pair.publicKey.replaceAll("\n", "\\n"),
    MEDIA_CDN_BASE_URL: "https://cdn.brand-assets.com/media",
    MEDIA_EXTERNAL_URL_HOSTS:
      "images.brand-assets.com, https://assets.brand-assets.org",
    COMMERCE_ENABLED: "false",
    MULTI_LOCALE_ENABLED: "false",
    R2_ACCESS_KEY_ID: "access-key",
    R2_ACCOUNT_ID: "account-id",
    R2_BUCKET: "bucket-name",
    R2_REGION: "auto",
    R2_SECRET_ACCESS_KEY: "super-secret",
    REDIS_URL: "rediss://cache-user:cache-secret@redis.brand-cache.com:6379/0",
    PREVIEW_TOKEN_SECRET: "super-preview-secret-value-123456789",
    STOREFRONT_REVALIDATE_SECRET: "super-revalidate-secret",
    STOREFRONT_REVALIDATE_URL: "https://web.brand-platform.com/",
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
    database: {
      configured: true,
      host: "db.brand-platform.com",
      migrations: {
        directory: "services/api/prisma/migrations",
        hasMigrationLock: true,
        issue: null,
        migrationCount: 1,
        productionReady: true,
      },
      productionReady: true,
      urlIssue: null,
      urlSafe: true,
      variable: "DATABASE_URL",
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
    identity: {
      jwt: {
        configured: true,
        pair: {
          checked: true,
          issue: null,
          valid: true,
        },
        privateKey: {
          configured: true,
          issue: null,
          valid: true,
        },
        productionReady: true,
        publicKey: {
          configured: true,
          issue: null,
          valid: true,
        },
      },
    },
    media: {
      cdnConfigured: true,
      cdnHost: "cdn.brand-assets.com",
      cdnProductionReady: true,
      cdnUrlIssue: null,
      cdnUrlSafe: true,
      cdnUsesLocalFallback: false,
      externalUrlHostIssues: [],
      externalUrlHosts: ["images.brand-assets.com", "assets.brand-assets.org"],
      externalUrlHostsProductionReady: true,
      r2: {
        configured: true,
        issues: [],
        missingRequired: [],
        region: "auto",
      },
    },
    preview: {
      configured: true,
      previousSecretConfigured: false,
      previousSecretIssue: null,
      previousSecretSafe: true,
      secretConfigured: true,
      secretIssue: null,
      secretSafe: true,
    },
    redis: {
      configured: true,
      host: "redis.brand-cache.com",
      productionReady: true,
      urlIssue: null,
      urlSafe: true,
      usesTls: true,
      variable: "REDIS_URL",
    },
    revalidation: {
      configured: true,
      endpointHost: "web.brand-platform.com",
      endpointPath: "/api/revalidate",
      requireRevalidation: true,
      secretConfigured: true,
      secretIssue: null,
      secretSafe: true,
      urlConfigured: true,
      urlIssue: null,
      urlSafe: true,
      urlSource: "STOREFRONT_REVALIDATE_URL",
      usesWebUrlFallback: false,
    },
  });

  const serialized = JSON.stringify(diagnostics);
  assert.equal(serialized.includes("super-secret"), false);
  assert.equal(serialized.includes("super-preview-secret-value"), false);
  assert.equal(serialized.includes("super-revalidate-secret"), false);
  assert.equal(serialized.includes("db-user"), false);
  assert.equal(serialized.includes("db-secret"), false);
  assert.equal(serialized.includes("PRIVATE KEY"), false);
  assert.equal(serialized.includes("PUBLIC KEY"), false);
  assert.equal(serialized.includes("bucket-name"), false);
  assert.equal(serialized.includes("account-id"), false);
  assert.equal(serialized.includes("access-key"), false);
  assert.equal(serialized.includes("cache-user"), false);
  assert.equal(serialized.includes("cache-secret"), false);
});

test("smoke environment diagnostics reports missing R2 and CDN fallback", () => {
  const diagnostics = createSmokeEnvironmentDiagnostics({});

  assert.deepEqual(diagnostics.media.r2.missingRequired, [
    "R2_ACCOUNT_ID",
    "R2_ACCESS_KEY_ID",
    "R2_SECRET_ACCESS_KEY",
    "R2_BUCKET",
  ]);
  assert.deepEqual(diagnostics.media.r2.issues, []);
  assert.equal(diagnostics.media.r2.configured, false);
  assert.equal(diagnostics.media.cdnConfigured, false);
  assert.equal(diagnostics.media.cdnHost, "cdn.local.invalid");
  assert.equal(diagnostics.media.cdnProductionReady, false);
  assert.equal(diagnostics.media.cdnUrlIssue, "local-host");
  assert.equal(diagnostics.media.cdnUrlSafe, false);
  assert.equal(diagnostics.media.cdnUsesLocalFallback, true);
  assert.deepEqual(diagnostics.media.externalUrlHostIssues, []);
  assert.deepEqual(diagnostics.media.externalUrlHosts, []);
  assert.equal(diagnostics.media.externalUrlHostsProductionReady, true);
  assert.equal(diagnostics.analytics.productionReady, true);
  assert.equal(diagnostics.database.configured, false);
  assert.equal(diagnostics.database.productionReady, false);
  assert.equal(diagnostics.redis.configured, false);
  assert.equal(diagnostics.redis.productionReady, false);
  assert.equal(diagnostics.redis.urlIssue, "missing-url");
  assert.equal(diagnostics.featureFlags.configured, false);
  assert.equal(diagnostics.featureFlags.productionReady, false);
  assert.equal(diagnostics.identity.jwt.configured, false);
  assert.equal(diagnostics.identity.jwt.productionReady, false);
  assert.deepEqual(diagnostics.preview, {
    configured: false,
    previousSecretConfigured: false,
    previousSecretIssue: null,
    previousSecretSafe: true,
    secretConfigured: false,
    secretIssue: "missing-secret",
    secretSafe: false,
  });
  assert.deepEqual(diagnostics.revalidation, {
    configured: false,
    endpointHost: null,
    endpointPath: null,
    requireRevalidation: true,
    secretConfigured: false,
    secretIssue: "missing-secret",
    secretSafe: false,
    urlConfigured: false,
    urlIssue: "missing-url",
    urlSafe: false,
    urlSource: null,
    usesWebUrlFallback: false,
  });
});

test("smoke environment diagnostics requires MEDIA_CDN_BASE_URL for CDN readiness", () => {
  const diagnostics = createSmokeEnvironmentDiagnostics({
    CDN_BASE_URL: "https://legacy-cdn.brand-assets.com/media",
  });

  assert.equal(diagnostics.media.cdnConfigured, false);
  assert.equal(diagnostics.media.cdnHost, "cdn.local.invalid");
  assert.equal(diagnostics.media.cdnProductionReady, false);
  assert.equal(diagnostics.media.cdnUrlIssue, "local-host");
  assert.equal(diagnostics.media.cdnUsesLocalFallback, true);
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
  const sharedAddressHost = createSmokeEnvironmentDiagnostics({
    MEDIA_CDN_BASE_URL: "https://100.64.0.10/media",
  });
  const privateIpv6Host = createSmokeEnvironmentDiagnostics({
    MEDIA_CDN_BASE_URL: "https://[fd00::1]/media",
  });
  const documentationIpv4Host = createSmokeEnvironmentDiagnostics({
    MEDIA_CDN_BASE_URL: "https://198.51.100.10/media",
  });
  const documentationIpv6Host = createSmokeEnvironmentDiagnostics({
    MEDIA_CDN_BASE_URL: "https://[2001:db8::1]/media",
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
  assert.equal(sharedAddressHost.media.cdnUrlIssue, "local-host");
  assert.equal(sharedAddressHost.media.cdnProductionReady, false);
  assert.equal(privateIpv6Host.media.cdnUrlIssue, "local-host");
  assert.equal(privateIpv6Host.media.cdnProductionReady, false);
  assert.equal(privateIpv6Host.media.cdnUsesLocalFallback, true);
  assert.equal(documentationIpv4Host.media.cdnUrlIssue, "placeholder-host");
  assert.equal(documentationIpv4Host.media.cdnProductionReady, false);
  assert.equal(documentationIpv6Host.media.cdnUrlIssue, "placeholder-host");
  assert.equal(documentationIpv6Host.media.cdnProductionReady, false);
  assert.equal(documentationIpv6Host.media.cdnUsesLocalFallback, false);
  assert.equal(placeholderHost.media.cdnUrlIssue, "placeholder-host");
  assert.equal(placeholderHost.media.cdnProductionReady, false);
  assert.equal(placeholderHost.media.cdnUrlSafe, false);
  assert.equal(placeholderHost.media.cdnUsesLocalFallback, false);
});

test("smoke environment diagnostics reports unsafe external media hosts", () => {
  const diagnostics = createSmokeEnvironmentDiagnostics({
    MEDIA_EXTERNAL_URL_HOSTS:
      "images.brand-assets.com, http://assets.brand-assets.com, https://user:secret@private.brand-assets.com, https://cdn.brand-assets.com/path?token=1, localhost, cdn.example.com, bad host",
  });

  assert.deepEqual(diagnostics.media.externalUrlHosts, [
    "images.brand-assets.com",
  ]);
  assert.equal(diagnostics.media.externalUrlHostsProductionReady, false);
  assert.deepEqual(diagnostics.media.externalUrlHostIssues, [
    {
      host: "assets.brand-assets.com",
      issue: "unsupported-protocol",
    },
    {
      host: "private.brand-assets.com",
      issue: "embedded-credentials",
    },
    {
      host: "cdn.brand-assets.com",
      issue: "unsupported-url-parts",
    },
    {
      host: "localhost",
      issue: "local-host",
    },
    {
      host: "cdn.example.com",
      issue: "placeholder-host",
    },
    {
      host: null,
      issue: "invalid-host",
    },
  ]);

  const serialized = JSON.stringify(diagnostics.media);
  assert.equal(serialized.includes("secret"), false);
  assert.equal(serialized.includes("token=1"), false);
});

function createRsaPemPair() {
  return generateKeyPairSync("rsa", {
    modulusLength: 2048,
    privateKeyEncoding: {
      format: "pem",
      type: "pkcs8",
    },
    publicKeyEncoding: {
      format: "pem",
      type: "spki",
    },
  });
}
