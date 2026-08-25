import assert from "node:assert/strict";
import test from "node:test";
import { createSmokeEnvironmentDiagnostics } from "./environment-diagnostics.mjs";

test("smoke environment diagnostics reports deployment URL readiness", () => {
  const diagnostics = createSmokeEnvironmentDiagnostics({
    ADMIN_URL: "https://admin.brand.com",
    API_URL: "https://api.brand.com/api/v1",
    WEB_URL: "https://store.brand.com",
  });

  assert.deepEqual(diagnostics.deployment, {
    admin: {
      configured: true,
      host: "admin.brand.com",
      path: "",
      productionReady: true,
      urlIssue: null,
      urlSafe: true,
      variable: "ADMIN_URL",
    },
    api: {
      configured: true,
      host: "api.brand.com",
      path: "/api/v1",
      productionReady: true,
      urlIssue: null,
      urlSafe: true,
      variable: "API_URL",
    },
    web: {
      configured: true,
      host: "store.brand.com",
      path: "",
      productionReady: true,
      urlIssue: null,
      urlSafe: true,
      variable: "WEB_URL",
    },
  });
});

test("smoke environment diagnostics reports unsafe deployment URLs", () => {
  const diagnostics = createSmokeEnvironmentDiagnostics({
    ADMIN_URL: "http://localhost:5173",
    API_URL: "https://api.example.com/graphql",
    WEB_URL: "https://store.example.com/page",
  });

  assert.equal(diagnostics.deployment.admin.urlIssue, "local-host");
  assert.equal(diagnostics.deployment.admin.productionReady, false);
  assert.equal(diagnostics.deployment.api.urlIssue, "unexpected-path");
  assert.equal(diagnostics.deployment.api.productionReady, false);
  assert.equal(diagnostics.deployment.web.urlIssue, "unexpected-path");
  assert.equal(diagnostics.deployment.web.productionReady, false);
});

test("smoke environment diagnostics rejects control characters in deployment URLs", () => {
  const diagnostics = createSmokeEnvironmentDiagnostics({
    ADMIN_URL: "https://admin.brand.com\t",
    API_URL: "https://api.brand.com\t/api/v1",
    WEB_URL: "https://store.brand.com\n.evil.com",
  });

  assert.deepEqual(diagnostics.deployment, {
    admin: {
      configured: true,
      host: null,
      path: null,
      productionReady: false,
      urlIssue: "control-character",
      urlSafe: false,
      variable: "ADMIN_URL",
    },
    api: {
      configured: true,
      host: null,
      path: null,
      productionReady: false,
      urlIssue: "control-character",
      urlSafe: false,
      variable: "API_URL",
    },
    web: {
      configured: true,
      host: null,
      path: null,
      productionReady: false,
      urlIssue: "control-character",
      urlSafe: false,
      variable: "WEB_URL",
    },
  });
});

test("smoke environment diagnostics rejects private and documentation IPv6 deployment hosts", () => {
  const diagnostics = createSmokeEnvironmentDiagnostics({
    ADMIN_URL: "https://[fd00::1]",
    API_URL: "https://[fe80::1]/api/v1",
    WEB_URL: "https://[2001:db8::1]",
  });

  assert.equal(diagnostics.deployment.admin.urlIssue, "local-host");
  assert.equal(diagnostics.deployment.admin.productionReady, false);
  assert.equal(diagnostics.deployment.api.urlIssue, "local-host");
  assert.equal(diagnostics.deployment.api.productionReady, false);
  assert.equal(diagnostics.deployment.web.urlIssue, "placeholder-host");
  assert.equal(diagnostics.deployment.web.productionReady, false);
});

test("smoke environment diagnostics rejects special IPv4 deployment hosts", () => {
  const diagnostics = createSmokeEnvironmentDiagnostics({
    ADMIN_URL: "https://100.64.0.10",
    API_URL: "https://198.18.0.10/api/v1",
    WEB_URL: "https://192.0.2.10",
  });

  assert.equal(diagnostics.deployment.admin.urlIssue, "local-host");
  assert.equal(diagnostics.deployment.admin.productionReady, false);
  assert.equal(diagnostics.deployment.api.urlIssue, "local-host");
  assert.equal(diagnostics.deployment.api.productionReady, false);
  assert.equal(diagnostics.deployment.web.urlIssue, "placeholder-host");
  assert.equal(diagnostics.deployment.web.productionReady, false);
});

test("smoke environment diagnostics uses smoke input deployment URLs", () => {
  const diagnostics = createSmokeEnvironmentDiagnostics(
    {
      ADMIN_URL: "https://admin.example.com",
      API_URL: "https://api.example.com/api/v1",
      WEB_URL: "https://web.example.com",
    },
    {
      adminUrl: "https://admin.brand.com",
      apiBaseUrl: "https://api.brand.com/api/v1",
      webUrl: "https://store.brand.com",
    },
  );

  assert.equal(diagnostics.deployment.admin.host, "admin.brand.com");
  assert.equal(diagnostics.deployment.admin.configured, true);
  assert.equal(diagnostics.deployment.admin.productionReady, true);
  assert.equal(diagnostics.deployment.api.host, "api.brand.com");
  assert.equal(diagnostics.deployment.api.configured, true);
  assert.equal(diagnostics.deployment.api.productionReady, true);
  assert.equal(diagnostics.deployment.web.host, "store.brand.com");
  assert.equal(diagnostics.deployment.web.configured, true);
  assert.equal(diagnostics.deployment.web.productionReady, true);
});
