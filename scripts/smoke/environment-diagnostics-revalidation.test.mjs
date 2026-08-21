import assert from "node:assert/strict";
import test from "node:test";
import { createSmokeEnvironmentDiagnostics } from "./environment-diagnostics.mjs";

test("smoke environment diagnostics reports revalidation WEB_URL fallback", () => {
  const diagnostics = createSmokeEnvironmentDiagnostics(
    {
      SMOKE_REQUIRE_REVALIDATION: "false",
      STOREFRONT_REVALIDATE_SECRET: "secret-value",
      WEB_URL: "https://web.example.com/storefront/",
    },
    { requireRevalidation: true },
  );

  assert.deepEqual(diagnostics.revalidation, {
    configured: true,
    endpointHost: "web.example.com",
    endpointPath: "/api/revalidate",
    requireRevalidation: true,
    secretConfigured: true,
    urlConfigured: true,
    urlIssue: null,
    urlSafe: true,
    urlSource: "WEB_URL",
    usesWebUrlFallback: true,
  });
});

test("smoke environment diagnostics reports unsafe revalidation URLs", () => {
  const diagnostics = createSmokeEnvironmentDiagnostics({
    STOREFRONT_REVALIDATE_SECRET: "secret-value",
    STOREFRONT_REVALIDATE_URL:
      "https://user:pass@web.example.com/api/revalidate",
  });

  assert.deepEqual(diagnostics.revalidation, {
    configured: false,
    endpointHost: "web.example.com",
    endpointPath: null,
    requireRevalidation: true,
    secretConfigured: true,
    urlConfigured: true,
    urlIssue: "embedded-credentials",
    urlSafe: false,
    urlSource: "STOREFRONT_REVALIDATE_URL",
    usesWebUrlFallback: false,
  });
});
