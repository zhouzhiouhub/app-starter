import assert from "node:assert/strict";
import test from "node:test";
import {
  formatSmokeProductionReadiness,
  printSmokeProductionReadiness,
} from "./smoke-readiness-cli.mjs";

test("smoke readiness CLI formats a ready report", () => {
  assert.deepEqual(
    formatSmokeProductionReadiness({
      blockers: [],
      productionReady: true,
      warnings: [],
    }),
    ["\nProduction readiness: ready."],
  );
});

test("smoke readiness CLI formats blockers with remediation context", () => {
  const lines = formatSmokeProductionReadiness({
    blockers: [
      {
        area: "deployment.api",
        host: "api.example.com",
        issue: "placeholder-host",
        message: "API_URL must be a production HTTPS URL.",
        path: "/api/v1",
        variable: "API_URL",
      },
      {
        area: "media.r2",
        issue: "missing-required-env",
        message: "Configure all required R2 variables before production smoke.",
        missingRequired: ["R2_SECRET_ACCESS_KEY"],
      },
      {
        area: "media.r2",
        issue: "invalid-config",
        issues: [
          {
            issue: "invalid-account-id",
            variable: "R2_ACCOUNT_ID",
          },
          {
            issue: "invalid-bucket",
            variable: "R2_BUCKET",
          },
        ],
        message: "R2 upload configuration contains invalid production values.",
      },
    ],
    nextActions: [
      {
        action: "Set API_URL to the deployed API HTTPS origin.",
        area: "deployment.api",
      },
      {
        action: "Set missing R2 variables: R2_SECRET_ACCESS_KEY.",
        area: "media.r2",
      },
      {
        action:
          "Fix invalid R2 variables: R2_ACCOUNT_ID must be a DNS-safe account label up to 63 characters; R2_BUCKET must be 3-63 characters using letters, numbers, dots, or hyphens.",
        area: "media.r2",
      },
    ],
    productionReady: false,
    warnings: [],
  });

  assert.deepEqual(lines, [
    "\nProduction readiness: blocked.",
    "Production smoke passed, but the report is not yet production-ready:",
    "  - [deployment.api/placeholder-host] API_URL must be a production HTTPS URL. (host: api.example.com, path: /api/v1, variable: API_URL)",
    "  - [media.r2/missing-required-env] Configure all required R2 variables before production smoke. (missing: R2_SECRET_ACCESS_KEY)",
    "  - [media.r2/invalid-config] R2 upload configuration contains invalid production values. (issues: R2_ACCOUNT_ID invalid-account-id, R2_BUCKET invalid-bucket)",
    "Next actions:",
    "  - [deployment.api] Set API_URL to the deployed API HTTPS origin.",
    "  - [media.r2] Set missing R2 variables: R2_SECRET_ACCESS_KEY.",
    "  - [media.r2] Fix invalid R2 variables: R2_ACCOUNT_ID must be a DNS-safe account label up to 63 characters; R2_BUCKET must be 3-63 characters using letters, numbers, dots, or hyphens.",
  ]);
});

test("smoke readiness CLI formats warnings and redacts secrets", () => {
  const lines = formatSmokeProductionReadiness({
    blockers: [],
    productionReady: true,
    warnings: [
      {
        area: "revalidation.url",
        issue: "uses-web-url-fallback",
        message:
          "Derived URL contains preview_token=payload.signature in diagnostics.",
      },
    ],
  });

  assert.equal(lines.length, 2);
  assert.equal(lines[1].includes("payload.signature"), false);
  assert.match(lines[1], /preview_token=\[redacted\]/);
});

test("smoke readiness CLI writes blocked reports to warning output", () => {
  const logLines = [];
  const warnLines = [];

  printSmokeProductionReadiness(
    {
      blockers: [
        {
          area: "deployment.admin",
          issue: "admin-smoke-not-required",
          message: "Set SMOKE_REQUIRE_ADMIN_APP=true.",
        },
      ],
      nextActions: [
        {
          action: "Set SMOKE_REQUIRE_ADMIN_APP=true.",
          area: "deployment.admin",
        },
      ],
      productionReady: false,
      warnings: [],
    },
    {
      log: (line) => logLines.push(line),
      warn: (line) => warnLines.push(line),
    },
  );

  assert.equal(logLines.length, 0);
  assert.equal(warnLines[0], "\nProduction readiness: blocked.");
});
