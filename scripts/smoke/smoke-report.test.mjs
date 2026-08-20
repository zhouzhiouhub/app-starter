import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  createSmokeReport,
  failSmokeReport,
  recordSmokeCheck,
  recordSmokeCheckFailure,
  writeSmokeReportIfConfigured,
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

test("smoke report includes deployment diagnostics for effective smoke URLs", () => {
  const report = createSmokeReport(
    {
      adminUrl: "https://admin.brand.com",
      apiBaseUrl: "https://api.brand.com/api/v1",
      locale: "en-US",
      market: "us",
      requireR2Upload: false,
      requireRevalidation: true,
      requireAdminApp: true,
      slug: "smoke-page",
      tenantSlug: "default",
      webUrl: "https://store.brand.com",
    },
    "Smoke Page",
    new Date("2026-08-20T00:00:00.000Z"),
  );

  assert.equal(report.config.adminUrl, "https://admin.brand.com");
  assert.equal(report.config.requireAdminApp, true);
  assert.equal(report.environment.deployment.admin.host, "admin.brand.com");
  assert.equal(report.environment.deployment.admin.productionReady, true);
  assert.equal(report.environment.deployment.api.host, "api.brand.com");
  assert.equal(report.environment.deployment.api.path, "/api/v1");
  assert.equal(report.environment.deployment.api.productionReady, true);
  assert.equal(report.environment.deployment.web.host, "store.brand.com");
  assert.equal(report.environment.deployment.web.productionReady, true);
});

test("smoke report redacts secrets from check details", async () => {
  const directory = await mkdtemp(join(tmpdir(), "app-smoke-report-"));

  try {
    const reportPath = join(directory, "report.json");
    const report = createSmokeReport(
      {
        apiBaseUrl: "https://api.example.com/api/v1",
        locale: "en-US",
        market: "us",
        requireR2Upload: true,
        requireRevalidation: true,
        slug: "smoke-page",
        tenantSlug: "default",
        webUrl: "https://web.example.com",
      },
      "Smoke Page",
      new Date("2026-08-20T00:00:00.000Z"),
    );

    recordSmokeCheck(report, "media.upload-target", {
      attempts: [
        {
          authorization: "Bearer header.payload.signature",
          uploadUrl:
            "https://uploads.example.com/object.png?X-Amz-Credential=credential-value&X-Amz-Signature=signature-value",
        },
      ],
      previewToken: "payload.signature",
    });
    recordSmokeCheckFailure(report, "media.confirm", new Error("failed"), {
      refreshToken: "refresh-token-value",
    });

    assert.equal(report.checks[0].details.previewToken, "[redacted]");
    assert.equal(report.checks[1].details.refreshToken, "[redacted]");

    await writeSmokeReportIfConfigured({ reportPath }, report);
    const written = await readFile(reportPath, "utf8");

    assert.equal(written.includes("payload.signature"), false);
    assert.equal(written.includes("credential-value"), false);
    assert.equal(written.includes("signature-value"), false);
    assert.equal(written.includes("refresh-token-value"), false);
    assert.match(written, /X-Amz-Credential=\[redacted\]/);
    assert.match(written, /X-Amz-Signature=\[redacted\]/);
  } finally {
    await rm(directory, { force: true, recursive: true });
  }
});

test("smoke report keeps structured failure diagnostics from errors", () => {
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
  const error = new Error("Revalidation failed with token=payload.signature");
  error.smokeDetails = {
    revalidation: {
      diagnosis: "revalidation-secret-mismatch",
      previewToken: "payload.signature",
      status: 401,
    },
  };

  recordSmokeCheckFailure(report, "page.publish", error);

  assert.deepEqual(report.checks[0].details, {
    revalidation: {
      diagnosis: "revalidation-secret-mismatch",
      previewToken: "[redacted]",
      status: 401,
    },
  });
  assert.equal(
    report.checks[0].error.message.includes("payload.signature"),
    false,
  );
});
