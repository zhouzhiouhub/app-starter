import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  createReleaseEvidenceCheckArtifact,
  createReleaseEvidenceCheck,
  formatReleaseEvidenceCheck,
  readReleaseCheckCliConfig,
  readReleaseEvidenceCheck,
} from "./release-check.mjs";
import {
  mvpPageBuilderComponents,
  pageBuilderVisualAcceptanceSchemaVersion,
} from "../visual/page-builder-visual-acceptance.mjs";
import { createProductionReadySmokeReport } from "../smoke/smoke-report-test-fixtures.mjs";
import {
  completeSmokeReport,
  recordSmokeCheck,
  refreshSmokeReportSummary,
} from "../smoke/smoke-report.mjs";

test("release check config parses defaults and evidence paths", () => {
  assert.deepEqual(readReleaseCheckCliConfig([]), {
    json: false,
    outputPath: null,
    smokeReportPath: null,
    visualManifestPath: "docs/development/page-builder-visual-acceptance.json",
  });
  assert.deepEqual(
    readReleaseCheckCliConfig([
      "--",
      "--smoke-report",
      "artifacts/production-smoke/smoke-report.json",
      "--visual-manifest",
      "reports/visual/accepted.json",
    ]),
    {
      json: false,
      outputPath: null,
      smokeReportPath: "artifacts/production-smoke/smoke-report.json",
      visualManifestPath: "reports/visual/accepted.json",
    },
  );
  assert.deepEqual(
    readReleaseCheckCliConfig(["artifacts/production-smoke/smoke-report.json"]),
    {
      json: false,
      outputPath: null,
      smokeReportPath: "artifacts/production-smoke/smoke-report.json",
      visualManifestPath: "docs/development/page-builder-visual-acceptance.json",
    },
  );
  assert.throws(
    () => readReleaseCheckCliConfig(["--bad-option"]),
    /Unknown release check option/,
  );
});

test("release check config parses JSON artifact output", () => {
  assert.deepEqual(
    readReleaseCheckCliConfig([
      "--json",
      "--output",
      "artifacts/release/release-check.json",
    ]),
    {
      json: true,
      outputPath: "artifacts/release/release-check.json",
      smokeReportPath: null,
      visualManifestPath: "docs/development/page-builder-visual-acceptance.json",
    },
  );
  assert.throws(
    () => readReleaseCheckCliConfig(["--output", "release-check.json"]),
    /Release check output must be under tmp\/, reports\/, artifacts\/, or \.tmp\//,
  );
});

test("release check accepts complete smoke and visual evidence", () => {
  const { evidenceRoot, manifest } = createAcceptedVisualManifest();
  const check = createReleaseEvidenceCheck({
    smokeArtifact: {
      path: "artifacts/production-smoke/smoke-report.json",
      report: createCompleteReleaseReport(),
    },
    visualEvidenceRoot: evidenceRoot,
    visualManifest: manifest,
    visualManifestPath: "reports/visual/accepted.json",
  });

  assert.equal(check.releaseReady, true);
  assert.equal(check.smoke.releaseReady, true);
  assert.equal(check.visual.status, "accepted");
  assert.deepEqual(formatReleaseEvidenceCheck(check).slice(-1), [
    "  Evidence is ready for release notes.",
  ]);
});

test("release check creates bounded JSON artifacts", () => {
  const { evidenceRoot, manifest } = createAcceptedVisualManifest();
  const check = createReleaseEvidenceCheck({
    smokeArtifact: {
      path: "artifacts/production-smoke/smoke-report.json",
      report: createCompleteReleaseReport(),
    },
    visualEvidenceRoot: evidenceRoot,
    visualManifest: manifest,
    visualManifestPath: "reports/visual/accepted.json",
  });
  const artifact = createReleaseEvidenceCheckArtifact(check, {
    generatedAt: "2026-08-28T00:00:00.000Z",
  });

  assert.equal(artifact.schemaVersion, "release-evidence-check.v1");
  assert.equal(artifact.generatedAt, "2026-08-28T00:00:00.000Z");
  assert.equal(artifact.status, "ready");
  assert.equal(artifact.releaseReady, true);
  assert.equal(artifact.smoke.path, "artifacts/production-smoke/smoke-report.json");
  assert.deepEqual(
    artifact.smoke.traceability.map((group) => `${group.label}:${group.status}`),
    ["R2/CDN:passed", "Admin static app:passed", "Publish flow:passed"],
  );
  assert.equal(artifact.visual.status, "accepted");
  assert.equal(artifact.visual.acceptedViewportCount, 12);
  assert.equal(artifact.blockerCount, 0);
});

test("release check blocks pending Page Builder visual evidence", () => {
  const check = createReleaseEvidenceCheck({
    smokeArtifact: {
      path: "artifacts/production-smoke/smoke-report.json",
      report: createCompleteReleaseReport(),
    },
    visualManifest: createPendingVisualManifest(),
    visualManifestPath: "docs/development/page-builder-visual-acceptance.json",
  });

  assert.equal(check.releaseReady, false);
  assert.equal(check.smoke.releaseReady, true);
  assert.equal(check.visual.status, "invalid");
  assert.equal(
    check.blockers.some(
      (blocker) =>
        blocker.area === "Page Builder Visual" &&
        blocker.label === "Visual acceptance invalid",
    ),
    true,
  );
});

test("release check summarizes smoke and visual blockers", () => {
  const smokeReport = createCompleteReleaseReport({
    requireAdminApp: false,
    requireR2Upload: false,
    requireRevalidation: false,
  });
  const check = createReleaseEvidenceCheck({
    smokeArtifact: { report: smokeReport },
    visualManifest: createPendingVisualManifest(),
    visualManifestPath: "docs/development/page-builder-visual-acceptance.json",
  });
  const lines = formatReleaseEvidenceCheck(check);

  assert.equal(lines.some((line) => line.includes("Status: blocked")), true);
  assert.equal(
    lines.some((line) => line.includes("Production Smoke")),
    true,
  );
  assert.equal(
    lines.some((line) => line.includes("Page Builder Visual")),
    true,
  );
});

test("release check reports missing smoke and pending visual together", async () => {
  const emptyArchiveRoot = mkdtempSync(path.join(tmpdir(), "release-empty-"));
  const check = await readReleaseEvidenceCheck(readReleaseCheckCliConfig([]), {
    smokeRoots: [emptyArchiveRoot],
    visualManifest: createPendingVisualManifest(),
  });

  assert.equal(check.releaseReady, false);
  assert.equal(
    check.blockers.some(
      (blocker) =>
        blocker.area === "Production Smoke" &&
        blocker.label === "Production smoke artifact missing",
    ),
    true,
  );
  assert.equal(
    check.blockers.some(
      (blocker) => blocker.area === "Page Builder Visual",
    ),
    true,
  );
});

test("release check command is exposed in package, CI, and release docs", async () => {
  const [packageJson, ciWorkflow, releaseChecklist] = await Promise.all([
    readFile("package.json", "utf8"),
    readFile(".github/workflows/ci.yml", "utf8"),
    readFile("docs/development/release-checklist.md", "utf8"),
  ]);

  assert.match(
    packageJson,
    /"release:check": "node scripts\/release-check\.mjs"/,
  );
  assert.match(ciWorkflow, /pnpm release:check -- --help/);
  assert.match(
    releaseChecklist,
    /pnpm release:check -- --smoke-report artifacts\/production-smoke\/smoke-report\.json/,
  );
  assert.match(releaseChecklist, /--output artifacts\/release\/release-check\.json/);
  assert.match(releaseChecklist, /release-evidence-check\.v1/);
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
  refreshSmokeReportSummary(report);

  return report;
}

function createAcceptedVisualManifest() {
  const evidenceRoot = mkdtempSync(path.join(tmpdir(), "release-visual-"));
  const records = mvpPageBuilderComponents.map((component) =>
    createAcceptedVisualRecord(evidenceRoot, component),
  );

  return {
    evidenceRoot,
    manifest: createVisualManifest(records),
  };
}

function createAcceptedVisualRecord(evidenceRoot, component) {
  return {
    component,
    label: component,
    status: "accepted",
    viewports: {
      desktop: createAcceptedViewportEvidence(evidenceRoot, component, "desktop"),
      mobile: createAcceptedViewportEvidence(evidenceRoot, component, "mobile"),
    },
  };
}

function createAcceptedViewportEvidence(evidenceRoot, component, viewport) {
  const designReference = `docs/design/${component}-${viewport}.png`;
  const previewScreenshot = `artifacts/visual/${component}-${viewport}.png`;

  writeEvidenceFile(evidenceRoot, designReference);
  writeEvidenceFile(evidenceRoot, previewScreenshot);

  return {
    designReference,
    maxColorDeltaE: 3,
    maxLayoutDeltaPx: 5,
    previewScreenshot,
    status: "accepted",
    visualMatchPercent: 95,
  };
}

function createPendingVisualManifest() {
  return createVisualManifest(
    mvpPageBuilderComponents.map((component) => ({
      component,
      label: component,
      status: "needs-evidence",
      viewports: {
        desktop: {
          designReference: null,
          maxColorDeltaE: null,
          maxLayoutDeltaPx: null,
          previewScreenshot: null,
          status: "needs-evidence",
          visualMatchPercent: null,
        },
        mobile: {
          designReference: null,
          maxColorDeltaE: null,
          maxLayoutDeltaPx: null,
          previewScreenshot: null,
          status: "needs-evidence",
          visualMatchPercent: null,
        },
      },
    })),
  );
}

function createVisualManifest(records) {
  return {
    records,
    schemaVersion: pageBuilderVisualAcceptanceSchemaVersion,
    targets: {
      components: mvpPageBuilderComponents,
      maxColorDeltaE: 3,
      maxLayoutDeltaPx: 5,
      minVisualMatchPercent: 95,
      viewports: ["desktop", "mobile"],
    },
  };
}

function writeEvidenceFile(root, relativePath) {
  const filePath = path.join(root, relativePath);
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, "retained image evidence");
}
