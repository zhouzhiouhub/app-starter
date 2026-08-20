import assert from "node:assert/strict";
import test from "node:test";
import {
  createSmokeReport,
  failSmokeReport,
  recordSmokeCheckFailure,
} from "./smoke-report.mjs";

test("smoke report redacts secrets from failure messages", () => {
  const report = createSmokeReport(
    {
      apiBaseUrl: "https://api.example.com/api/v1",
      locale: "en-US",
      market: "us",
      requireR2Upload: false,
      requireRevalidation: true,
      slug: "smoke-page",
      tenantSlug: "default",
      webUrl: "https://web.example.com",
    },
    "Smoke Page",
    new Date("2026-08-20T00:00:00.000Z"),
  );

  const error = new Error(
    "Login failed with password=ChangeMe456! and Authorization Bearer header.payload.signature",
  );

  recordSmokeCheckFailure(report, "auth.login", error);
  failSmokeReport(report, error);

  const serialized = JSON.stringify(report);
  assert.equal(serialized.includes("ChangeMe456!"), false);
  assert.equal(serialized.includes("header.payload.signature"), false);
  assert.equal(report.checks[0].error.message.includes("[redacted]"), true);
  assert.equal(report.error.message.includes("[redacted]"), true);
});
