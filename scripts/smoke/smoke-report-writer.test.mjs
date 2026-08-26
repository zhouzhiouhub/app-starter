import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  completeSmokeReport,
  createSmokeReportSummary,
  failSmokeReport,
  recordSmokeCheck,
  recordSmokeCheckFailure,
  smokeReportSchemaVersion,
  writeSmokeReportIfConfigured,
} from "./smoke-report.mjs";
import { createTestSmokeReport } from "./smoke-report-test-fixtures.mjs";

test("smoke report redacts secrets from failure messages", () => {
  const report = createTestSmokeReport();
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
    const report = createTestSmokeReport({ requireR2Upload: true });

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
    failSmokeReport(report, new Error("failed"));

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

test("smoke report helper writes JSON when configured", async () => {
  const directory = await mkdtemp(join(tmpdir(), "app-smoke-"));

  try {
    const reportPath = join(directory, "report.json");
    const report = createTestSmokeReport(
      {},
      { now: "2026-08-19T00:00:00.000Z" },
    );

    completeSmokeReport(report, {
      pageId: "page-1",
      storefrontRequestUrl: "https://web.example.com/en/smoke-page",
      storefrontUrl: "https://web.example.com/en/smoke-page",
    });
    await writeSmokeReportIfConfigured({ reportPath }, report);
    const written = JSON.parse(await readFile(reportPath, "utf8"));

    assert.equal(written.slug, "smoke-page");
    assert.equal(written.config.apiBaseUrl, "https://api.example.com/api/v1");
    assert.equal(written.environment.revalidation.requireRevalidation, true);
  } finally {
    await rm(directory, { force: true, recursive: true });
  }
});

test("smoke report writer bounds production readiness artifact fields", async () => {
  const directory = await mkdtemp(join(tmpdir(), "app-smoke-readiness-"));

  try {
    const reportPath = join(directory, "report.json");
    const report = createTestSmokeReport();
    const longValue = "x".repeat(1200);

    report.productionReadiness = {
      blockers: [
        {
          area: `custom.runtime.${longValue}`,
          host: `api.${longValue}.brand.com`,
          issue: `unsafe-value-${longValue}`,
          message: `Fix token=payload.signature.\n${longValue}`,
          missingRequired: [
            `SMOKE_${longValue}`,
            `https://api.example.com/health?token=payload.signature&next=${longValue}`,
          ],
        },
      ],
      nextActions: [
        {
          action: `Rotate Authorization Bearer abc.def.ghi.\r\n${longValue}`,
          area: `custom.runtime.${longValue}`,
        },
      ],
      productionReady: false,
      warnings: [],
    };
    completeSmokeReport(report, {
      pageId: "page-1",
      storefrontRequestUrl: "https://web.example.com/en/smoke-page",
      storefrontUrl: "https://web.example.com/en/smoke-page",
    });

    await writeSmokeReportIfConfigured({ reportPath }, report);
    const written = await readFile(reportPath, "utf8");
    const artifact = JSON.parse(written);
    const blocker = artifact.productionReadiness.blockers[0];
    const action = artifact.productionReadiness.nextActions[0];

    assert.equal(written.includes("payload.signature"), false);
    assert.equal(written.includes("abc.def.ghi"), false);
    assert.doesNotMatch(blocker.message, /[\r\n]/);
    assert.doesNotMatch(action.action, /[\r\n]/);
    assert.match(blocker.message, /\.\.\.$/);
    assert.match(action.action, /\.\.\.$/);
    assert.equal(blocker.message.length <= 512, true);
    assert.equal(blocker.area.length <= 160, true);
    assert.equal(action.action.length <= 512, true);
  } finally {
    await rm(directory, { force: true, recursive: true });
  }
});

test("smoke report writer bounds failed check artifact fields", async () => {
  const directory = await mkdtemp(join(tmpdir(), "app-smoke-failures-"));

  try {
    const reportPath = join(directory, "report.json");
    const report = createTestSmokeReport();
    const longValue = "z".repeat(3000);
    const error = new Error(
      `Public page failed with token=payload.signature.\n${longValue}`,
    );
    error.smokeDetails = {
      publicApi: {
        diagnosis: `response-body-mismatch-${longValue}`,
        responseBody: `<html>${longValue}</html>`,
        redirectLocation: `https://web.example.com/login?token=payload.signature&next=${longValue}`,
      },
    };

    recordSmokeCheckFailure(
      report,
      `public-page.api.${longValue}`,
      error,
      {
        request: {
          body: `Authorization Bearer abc.def.ghi\r\n${longValue}`,
        },
      },
    );
    failSmokeReport(report, error);

    await writeSmokeReportIfConfigured({ reportPath }, report);
    const written = await readFile(reportPath, "utf8");
    const artifact = JSON.parse(written);
    const check = artifact.checks[0];
    const summaryDetail = artifact.summary.failedCheckDetails[0];

    assert.equal(written.includes("payload.signature"), false);
    assert.equal(written.includes("abc.def.ghi"), false);
    assert.doesNotMatch(check.error.message, /[\r\n]/);
    assert.doesNotMatch(check.details.request.body, /[\r\n]/);
    assert.match(check.error.message, /\.\.\.$/);
    assert.match(check.details.publicApi.responseBody, /\.\.\.$/);
    assert.equal(check.name.length <= 160, true);
    assert.equal(check.error.message.length <= 1024, true);
    assert.equal(check.details.publicApi.responseBody.length <= 2048, true);
    assert.deepEqual(summaryDetail, {
      details: check.details,
      message: check.error.message,
      name: check.name,
    });
  } finally {
    await rm(directory, { force: true, recursive: true });
  }
});

test("smoke report keeps structured failure diagnostics from errors", () => {
  const report = createTestSmokeReport();
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

test("smoke report summary includes structured failure diagnostics", () => {
  const report = createTestSmokeReport();
  const error = new Error("Storefront canonical mismatch.");
  error.smokeDetails = {
    storefrontSeo: {
      canonicalHref: "https://web.example.com/en/smoke-page",
      expectedCanonicalUrl: "https://store.brand.com/en/smoke-page",
    },
  };

  recordSmokeCheckFailure(report, "storefront.page", error);

  assert.deepEqual(report.summary.failedCheckDetails, [
    {
      details: {
        storefrontSeo: {
          canonicalHref: "https://web.example.com/en/smoke-page",
          expectedCanonicalUrl: "https://store.brand.com/en/smoke-page",
        },
      },
      message: "Storefront canonical mismatch.",
      name: "storefront.page",
    },
  ]);
});

test("smoke report reads messages from object-shaped failures", () => {
  const report = createTestSmokeReport();
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
  const report = createTestSmokeReport();

  recordSmokeCheckFailure(report, "auth.login", "");
  failSmokeReport(report, null);

  assert.equal(report.checks[0].error.message, "Unknown smoke failure.");
  assert.equal(report.error.message, "Unknown smoke failure.");
});
