import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  createSmokeReport,
  createSmokeReportSummary,
  failSmokeReport,
  recordSmokeCheck,
  recordSmokeCheckFailure,
  smokeReportSchemaVersion,
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
  assert.equal(report.schemaVersion, smokeReportSchemaVersion);
  assert.equal(serialized.includes("ChangeMe456!"), false);
  assert.equal(serialized.includes("header.payload.signature"), false);
  assert.equal(report.checks[0].error.message.includes("[redacted]"), true);
  assert.equal(report.error.message.includes("[redacted]"), true);
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

    assert.equal(
      written.includes(`"schemaVersion": "${smokeReportSchemaVersion}"`),
      true,
    );
    assert.deepEqual(
      JSON.parse(written).summary,
      createSmokeReportSummary(report),
    );
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

test("smoke report writer rejects incomplete reports before disk write", async () => {
  const directory = await mkdtemp(join(tmpdir(), "app-smoke-report-invalid-"));

  try {
    const reportPath = join(directory, "report.json");

    await assert.rejects(
      () =>
        writeSmokeReportIfConfigured(
          { reportPath },
          {
            checks: [],
            schemaVersion: "old-version",
          },
        ),
      /Smoke report is missing required fields/,
    );
    await assert.rejects(() => readFile(reportPath, "utf8"));
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

test("smoke report reads messages from object-shaped failures", () => {
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
  const failure = {
    message: "Fetch failed with token=payload.signature",
    smokeDetails: {
      request: {
        previewToken: "payload.signature",
        status: 503,
      },
    },
  };

  recordSmokeCheckFailure(report, "public-page.api", failure);
  failSmokeReport(report, failure);

  assert.equal(
    report.checks[0].error.message,
    "Fetch failed with token=[redacted]",
  );
  assert.equal(report.error.message, "Fetch failed with token=[redacted]");
  assert.deepEqual(report.checks[0].details, {
    request: {
      previewToken: "[redacted]",
      status: 503,
    },
  });
});

test("smoke report uses a stable fallback for empty failures", () => {
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

  recordSmokeCheckFailure(report, "auth.login", "");
  failSmokeReport(report, null);

  assert.equal(report.checks[0].error.message, "Unknown smoke failure.");
  assert.equal(report.error.message, "Unknown smoke failure.");
});
