import assert from "node:assert/strict";
import { mkdir, rm, writeFile } from "node:fs/promises";
import test from "node:test";
import {
  createSmokeReleaseCheck,
  formatSmokeReleaseCheck,
  readSmokeReleaseCheckArtifact,
  readSmokeReleaseCheckCliConfig,
} from "./smoke-release-check.mjs";
import { createProductionReadySmokeReport } from "./smoke-report-test-fixtures.mjs";
import {
  completeSmokeReport,
  recordSmokeCheck,
  refreshSmokeReportSummary,
} from "./smoke-report.mjs";
import { createStarterPagesSmokeDetails } from "./starter-pages-smoke.mjs";

const archiveRoot = `tmp/smoke-release-check-test-${process.pid}`;

test("smoke release check accepts full production evidence", () => {
  const report = createCompleteReleaseReport();
  const result = createSmokeReleaseCheck({
    path: "artifacts/production-smoke/smoke-report.json",
    report,
  });

  assert.equal(result.releaseReady, true);
  assert.deepEqual(
    result.groups.map((group) => `${group.label}:${group.status}`),
    ["R2/CDN:passed", "Admin static app:passed", "Publish flow:passed"],
  );
  assert.deepEqual(formatSmokeReleaseCheck({ report }).slice(-1), [
    "  Evidence is ready for release notes.",
  ]);
});

test("smoke release check blocks optional gate reports", () => {
  const report = createCompleteReleaseReport({
    requireAdminApp: false,
    requireR2Upload: false,
    requireRevalidation: false,
  });
  const result = createSmokeReleaseCheck({ report });

  assert.equal(result.releaseReady, false);
  const blockerLabels = result.blockers.map((blocker) => blocker.label);

  assert.equal(blockerLabels.includes("R2 upload smoke required"), true);
  assert.equal(blockerLabels.includes("Admin static app smoke required"), true);
  assert.equal(
    blockerLabels.includes("Storefront revalidation smoke required"),
    true,
  );
  assert.equal(
    blockerLabels.includes("Production readiness gates blocked"),
    true,
  );
});

test("smoke release check blocks missing traceability checks", () => {
  const report = createProductionReadySmokeReport();

  recordSmokeCheck(report, "api.health");
  completeSmokeReport(report, {
    pageId: "page-1",
    storefrontRequestUrl: "https://store.brand.com/en/smoke-page",
    storefrontUrl: "https://store.brand.com/en/smoke-page",
  });

  const lines = formatSmokeReleaseCheck({ report });

  assert.equal(lines.some((line) => line.includes("Status: blocked")), true);
  assert.equal(
    lines.some((line) => line.includes("R2/CDN traceability missing")),
    true,
  );
  assert.equal(
    lines.some((line) => line.includes("Publish flow traceability missing")),
    true,
  );
});

test("smoke release check blocks weak R2 and Admin evidence details", () => {
  const report = createCompleteReleaseReport();
  const mediaCheck = report.checks.find(
    (check) => check.name === "media.upload-target",
  );
  const adminCheck = report.checks.find((check) => check.name === "admin.app");

  mediaCheck.details.uploadedObject = false;
  adminCheck.details.moduleScriptOk = false;
  refreshSmokeReportSummary(report);

  const result = createSmokeReleaseCheck({ report });

  assert.equal(result.releaseReady, false);
  assert.equal(
    result.blockers.some((blocker) =>
      blocker.action.includes("uploadedObject=true"),
    ),
    true,
  );
  assert.equal(
    result.blockers.some((blocker) =>
      blocker.action.includes("module script is reachable"),
    ),
    true,
  );
});

test("smoke release check blocks weak starter page evidence details", () => {
  const report = createCompleteReleaseReport();
  const starterCheck = report.checks.find(
    (check) => check.name === "starter-pages.published",
  );

  starterCheck.details.publicPages = starterCheck.details.publicPages.filter(
    (page) => page.slug !== "404",
  );
  refreshSmokeReportSummary(report);

  const result = createSmokeReleaseCheck({ report });

  assert.equal(result.releaseReady, false);
  assert.equal(
    result.blockers.some((blocker) =>
      blocker.action.includes("seeded 404 public API readiness"),
    ),
    true,
  );
});

test("smoke release check parses pnpm separator and explicit path", () => {
  assert.deepEqual(readSmokeReleaseCheckCliConfig(["--", "--latest"]), {
    reportPath: null,
  });
  assert.deepEqual(
    readSmokeReleaseCheckCliConfig([
      "--",
      "artifacts/production-smoke/smoke-report.json",
    ]),
    { reportPath: "artifacts/production-smoke/smoke-report.json" },
  );
  assert.throws(
    () => readSmokeReleaseCheckCliConfig(["--list"]),
    /Unknown smoke release check option/,
  );
});

test("smoke release check reads latest archived report", async () => {
  await rm(archiveRoot, { force: true, recursive: true });
  await mkdir(archiveRoot, { recursive: true });

  try {
    await writeReport(`${archiveRoot}/old.json`, "2026-08-20T00:00:00.000Z");
    await writeReport(`${archiveRoot}/latest.json`, "2026-08-21T00:00:00.000Z");

    const artifact = await readSmokeReleaseCheckArtifact({
      reportPath: null,
      roots: [archiveRoot],
    });

    assert.equal(artifact.path, `${archiveRoot}/latest.json`);
  } finally {
    await rm(archiveRoot, { force: true, recursive: true });
  }
});

function createCompleteReleaseReport(overrides = {}) {
  const report = createProductionReadySmokeReport(overrides);

  recordSmokeCheck(report, "admin.app", {
    hasHtmlContentType: true,
    hasModuleScript: true,
    hasRootElement: true,
    modulePreloadOk: true,
    moduleScriptHasJavaScriptContentType: true,
    moduleScriptOk: true,
    moduleScriptUrlIssue: null,
    ok: true,
    stylesheetOk: true,
  });
  recordSmokeCheck(report, "media.upload-target", {
    assetR2KeyMatchesTarget: true,
    cdnUrlMatchesR2Key: true,
    isR2UploadUrl: true,
    productionCdn: true,
    uploadedObject: true,
    uploadUrlMatchesR2Key: true,
  });
  for (const name of [
    "api.health",
    "auth.login",
    "feature-flags.disabled",
    "page.preview",
    "audit.logs",
    "public-page.api",
    "public-page.fallback-api",
    "storefront.page",
    "seo.robots",
    "seo.sitemap",
    "seo.not-found",
  ]) {
    recordSmokeCheck(report, name);
  }
  recordSmokeCheck(
    report,
    "starter-pages.published",
    createStarterPagesSmokeDetails("en-US"),
  );
  recordSmokeCheck(report, "page.publish", {
    revalidation: {
      required: true,
      triggered: true,
    },
  });
  recordSmokeCheck(report, "page.rollback", {
    revalidation: {
      required: true,
      triggered: true,
    },
  });
  completeSmokeReport(report, {
    pageId: "page-1",
    storefrontRequestUrl: "https://store.brand.com/en/smoke-page",
    storefrontUrl: "https://store.brand.com/en/smoke-page",
  });

  return report;
}

async function writeReport(path, finishedAt) {
  const report = createCompleteReleaseReport();
  report.finishedAt = finishedAt;
  refreshSmokeReportSummary(report);
  await writeFile(path, `${JSON.stringify(report, null, 2)}\n`);
}
