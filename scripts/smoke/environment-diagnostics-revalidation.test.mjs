import assert from "node:assert/strict";
import test from "node:test";
import { createSmokeEnvironmentDiagnostics } from "./environment-diagnostics.mjs";

test("smoke environment diagnostics reports revalidation WEB_URL fallback", () => {
  const diagnostics = createSmokeEnvironmentDiagnostics(
    {
      SMOKE_REQUIRE_REVALIDATION: "false",
      STOREFRONT_REVALIDATE_SECRET: "secret-value",
      WEB_URL: "https://web.brand.com/storefront/",
    },
    { requireRevalidation: true },
  );

  assert.deepEqual(diagnostics.revalidation, {
    configured: true,
    endpointHost: "web.brand.com",
    endpointPath: "/api/revalidate",
    requireRevalidation: true,
    secretConfigured: true,
    secretIssue: null,
    secretSafe: true,
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
    secretIssue: null,
    secretSafe: true,
    urlConfigured: true,
    urlIssue: "embedded-credentials",
    urlSafe: false,
    urlSource: "STOREFRONT_REVALIDATE_URL",
    usesWebUrlFallback: false,
  });
});

test("smoke environment diagnostics rejects unsafe revalidation secrets", () => {
  for (const [secret, issue] of [
    ["secret-1\r\nx-secret: leaked", "control-character"],
    ["a".repeat(1025), "oversized-secret"],
  ]) {
    const diagnostics = createSmokeEnvironmentDiagnostics({
      STOREFRONT_REVALIDATE_SECRET: secret,
      STOREFRONT_REVALIDATE_URL: "https://web.brand.com/api/revalidate",
    });

    assert.equal(diagnostics.revalidation.configured, false);
    assert.equal(diagnostics.revalidation.secretConfigured, true);
    assert.equal(diagnostics.revalidation.secretIssue, issue);
    assert.equal(diagnostics.revalidation.secretSafe, false);
  }
});

test("smoke environment diagnostics requires production revalidation URLs", () => {
  for (const [value, issue] of [
    ["http://web.brand.com/api/revalidate", "insecure-protocol"],
    ["https://localhost:3000/api/revalidate", "local-host"],
    ["https://web.example.com/api/revalidate", "placeholder-host"],
  ]) {
    const diagnostics = createSmokeEnvironmentDiagnostics({
      STOREFRONT_REVALIDATE_SECRET: "secret-value",
      STOREFRONT_REVALIDATE_URL: value,
    });

    assert.equal(diagnostics.revalidation.configured, false);
    assert.equal(diagnostics.revalidation.urlSafe, false);
    assert.equal(diagnostics.revalidation.urlIssue, issue);
  }
});

test("smoke environment diagnostics rejects misspelled revalidation flags", () => {
  assert.throws(
    () =>
      createSmokeEnvironmentDiagnostics({
        SMOKE_REQUIRE_REVALIDATION: "flase",
        STOREFRONT_REVALIDATE_SECRET: "secret-value",
        STOREFRONT_REVALIDATE_URL: "https://web.brand.com/api/revalidate",
      }),
    /SMOKE_REQUIRE_REVALIDATION must be true or false/,
  );
});
