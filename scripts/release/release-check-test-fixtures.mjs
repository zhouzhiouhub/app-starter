import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  completeSmokeReport,
  recordSmokeCheck,
  refreshSmokeReportSummary,
} from "../smoke/smoke-report.mjs";
import { createStarterPagesSmokeDetails } from "../smoke/starter-pages-smoke.mjs";
import { createProductionReadySmokeReport } from "../smoke/smoke-report-test-fixtures.mjs";
import {
  mvpPageBuilderComponents,
  pageBuilderVisualAcceptanceSchemaVersion,
} from "../visual/page-builder-visual-acceptance.mjs";

export function createCompleteReleaseReport(overrides = {}) {
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
  refreshSmokeReportSummary(report);

  return report;
}

export function createAcceptedVisualManifest() {
  const evidenceRoot = mkdtempSync(path.join(tmpdir(), "release-visual-"));
  const records = mvpPageBuilderComponents.map((component) =>
    createAcceptedVisualRecord(evidenceRoot, component),
  );

  return {
    evidenceRoot,
    manifest: createVisualManifest(records),
  };
}

export function createPendingVisualManifest() {
  return createVisualManifest(
    mvpPageBuilderComponents.map((component) => ({
      component,
      label: component,
      status: "needs-evidence",
      viewports: {
        desktop: createPendingViewportEvidence(),
        mobile: createPendingViewportEvidence(),
      },
    })),
  );
}

export function createVisualArtifactCheck(input) {
  const complete = input.status === "complete";

  return {
    artifactDir: "reports/visual/page-builder-fixture",
    expectedScreenshotCount: 12,
    issues: complete
      ? []
      : [
          {
            code: "missing_artifact_file",
            message: "capture report is missing.",
            severity: "error",
          },
        ],
    presentRequiredFileCount: complete ? 6 : 5,
    presentScreenshotCount: complete ? 12 : 0,
    requiredFileCount: 6,
    status: input.status,
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

function createPendingViewportEvidence() {
  return {
    designReference: null,
    maxColorDeltaE: null,
    maxLayoutDeltaPx: null,
    previewScreenshot: null,
    status: "needs-evidence",
    visualMatchPercent: null,
  };
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
