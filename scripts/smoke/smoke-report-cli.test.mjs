import assert from "node:assert/strict";
import test from "node:test";
import {
  formatSmokeReportSummary,
  printSmokeReportSummary,
} from "./smoke-report-cli.mjs";

test("smoke report CLI formats a ready summary", () => {
  assert.deepEqual(
    formatSmokeReportSummary({
      schemaVersion: "smoke-report.v3",
      summary: {
        blockerCount: 0,
        checkCount: 12,
        failedCheckCount: 0,
        failedChecks: [],
        passedCheckCount: 12,
        productionReady: true,
        status: "passed",
        warningCount: 0,
      },
    }),
    [
      "\nSmoke report summary (smoke-report.v3):",
      "  Status: passed",
      "  Checks: 12/12 passed, 0 failed",
      "  Smoke passed: yes",
      "  Production gates: passed",
    ],
  );
});

test("smoke report CLI formats blockers and redacts failed checks", () => {
  const lines = formatSmokeReportSummary({
    schemaVersion: "smoke-report.v3",
    summary: {
      blockerCount: 2,
      checkCount: 7,
      failedCheckCount: 1,
      failedChecks: ["preview.token=payload.signature"],
      passedCheckCount: 6,
      productionReady: false,
      status: "failed",
      warningCount: 1,
    },
  });

  assert.deepEqual(lines, [
    "\nSmoke report summary (smoke-report.v3):",
    "  Status: failed",
    "  Checks: 6/7 passed, 1 failed",
    "  Smoke passed: no",
    "  Production gates: blocked",
    "  Readiness: 2 blockers, 1 warnings",
    "  Failed checks: preview.token=[redacted]",
  ]);
});

test("smoke report CLI separates smoke failures from production gates", () => {
  assert.deepEqual(
    formatSmokeReportSummary({
      schemaVersion: "smoke-report.v3",
      summary: {
        blockerCount: 0,
        checkCount: 3,
        failedCheckCount: 1,
        failedChecks: ["storefront.page"],
        passedCheckCount: 2,
        productionReady: true,
        status: "failed",
        warningCount: 0,
      },
    }),
    [
      "\nSmoke report summary (smoke-report.v3):",
      "  Status: failed",
      "  Checks: 2/3 passed, 1 failed",
      "  Smoke passed: no",
      "  Production gates: passed",
      "  Failed checks: storefront.page",
    ],
  );
});

test("smoke report CLI includes failed check diagnostics and suggested fixes", () => {
  const lines = formatSmokeReportSummary({
    schemaVersion: "smoke-report.v3",
    summary: {
      blockerCount: 0,
      checkCount: 4,
      failedCheckCount: 1,
      failedCheckDetails: [
        {
          details: {
            revalidation: {
              diagnosis: "revalidation-secret-mismatch",
              status: 401,
            },
          },
          message:
            "Storefront revalidation failed with token=payload.signature",
          name: "page.publish",
        },
      ],
      failedChecks: ["page.publish"],
      passedCheckCount: 3,
      productionReady: true,
      status: "failed",
      warningCount: 0,
    },
  });

  assert.deepEqual(lines, [
    "\nSmoke report summary (smoke-report.v3):",
    "  Status: failed",
    "  Checks: 3/4 passed, 1 failed",
    "  Smoke passed: no",
    "  Production gates: passed",
    "  Failed checks: page.publish",
    "  Failure details:",
    "    - page.publish: Storefront revalidation failed with token=[redacted] (diagnosis: revalidation-secret-mismatch)",
    "  Suggested fixes:",
    "    - Make STOREFRONT_REVALIDATE_SECRET match between API and Web runtimes.",
  ]);
});

test("smoke report CLI suggests fixes for media diagnostics", () => {
  const lines = formatSmokeReportSummary({
    schemaVersion: "smoke-report.v3",
    summary: {
      blockerCount: 0,
      checkCount: 5,
      failedCheckCount: 2,
      failedCheckDetails: [
        {
          details: {
            mediaUploadTarget: {
              isR2UploadUrl: false,
              uploadUrlMatchesR2Key: false,
            },
          },
          message:
            "Media upload target is not a secure Cloudflare R2 presigned URL.",
          name: "media.upload-target",
        },
        {
          details: {
            media: {
              cdnUrlMatchesR2Key: false,
              productionCdn: false,
            },
          },
          message: "Media confirm did not return a production CDN URL.",
          name: "media.confirm",
        },
      ],
      failedChecks: ["media.upload-target", "media.confirm"],
      passedCheckCount: 3,
      productionReady: true,
      status: "failed",
      warningCount: 0,
    },
  });

  assert.equal(
    lines.includes(
      "    - Configure R2 upload variables so /media/upload-url returns a Cloudflare R2 presigned PUT URL.",
    ),
    true,
  );
  assert.equal(
    lines.includes(
      "    - Check R2 object-key signing so the presigned upload URL path matches the returned r2Key.",
    ),
    true,
  );
  assert.equal(
    lines.includes(
      "    - Set MEDIA_CDN_BASE_URL to a production HTTPS CDN host before requiring R2 smoke.",
    ),
    true,
  );
  assert.equal(
    lines.includes(
      "    - Check media confirm URL generation so the CDN URL points to the confirmed R2 key.",
    ),
    true,
  );
});

test("smoke report CLI suggests fixes for public API diagnostics", () => {
  const lines = formatSmokeReportSummary({
    schemaVersion: "smoke-report.v3",
    summary: {
      blockerCount: 0,
      checkCount: 3,
      failedCheckCount: 1,
      failedCheckDetails: [
        {
          details: {
            publicApi: {
              diagnosis: "title-mismatch",
              locale: "en-US",
            },
          },
          message:
            "Public page API did not return published title token=payload.signature",
          name: "public-page.api",
        },
      ],
      failedChecks: ["public-page.api"],
      passedCheckCount: 2,
      productionReady: true,
      status: "failed",
      warningCount: 0,
    },
  });

  assert.equal(
    lines.includes(
      "    - public-page.api: Public page API did not return published title token=[redacted] (diagnosis: title-mismatch)",
    ),
    true,
  );
  assert.equal(
    lines.includes(
      "    - Check that publish wrote the expected PageVersion and the public page API reads the current published slug.",
    ),
    true,
  );
});

test("smoke report CLI writes failed summaries to warning output", () => {
  const logLines = [];
  const warnLines = [];

  printSmokeReportSummary(
    {
      schemaVersion: "smoke-report.v3",
      summary: {
        checkCount: 1,
        failedCheckCount: 1,
        failedChecks: ["page.publish"],
        passedCheckCount: 0,
        productionReady: false,
        status: "failed",
      },
    },
    {
      log: (line) => logLines.push(line),
      warn: (line) => warnLines.push(line),
    },
  );

  assert.equal(logLines.length, 0);
  assert.equal(warnLines[0], "\nSmoke report summary (smoke-report.v3):");
});

test("smoke report CLI writes blocked production gates to warning output", () => {
  const logLines = [];
  const warnLines = [];

  printSmokeReportSummary(
    {
      schemaVersion: "smoke-report.v3",
      summary: {
        blockerCount: 1,
        checkCount: 3,
        failedCheckCount: 0,
        failedChecks: [],
        passedCheckCount: 3,
        productionReady: false,
        status: "passed",
      },
    },
    {
      log: (line) => logLines.push(line),
      warn: (line) => warnLines.push(line),
    },
  );

  assert.equal(logLines.length, 0);
  assert.equal(warnLines[0], "\nSmoke report summary (smoke-report.v3):");
});
