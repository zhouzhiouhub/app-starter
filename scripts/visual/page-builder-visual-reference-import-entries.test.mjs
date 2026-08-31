import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import test from "node:test";
import { checkPageBuilderVisualArtifact } from "./page-builder-visual-artifact-check.mjs";
import {
  createArtifactDir,
  hasIssue,
  writeVisualArtifact,
} from "./page-builder-visual-artifact-check-test-fixtures.mjs";
import { createPageBuilderVisualReferenceImportMarkdown } from "./page-builder-visual-reference-import.mjs";

test("visual artifact check rejects unknown missing reference entries", () => {
  const artifactDir = createArtifactDir("unknown-missing-reference");

  try {
    writeVisualArtifactWithReferenceImportReport(
      artifactDir,
      createReferenceImportReportOverride(artifactDir, {
        missing: [
          {
            component: "product-card",
            expectedPath:
              "docs/visual/page-builder-references/product-card-desktop.png",
            reason: "product-card-desktop.png is missing",
            viewport: "desktop",
          },
        ],
        missingCount: 1,
        status: "invalid",
      }),
    );

    const report = checkPageBuilderVisualArtifact({ artifactDir });

    assert.equal(report.status, "invalid");
    assert.equal(
      hasIssue(report, "invalid_reference_import_missing_entry"),
      true,
    );
  } finally {
    rmSync(artifactDir, { force: true, recursive: true });
  }
});

test("visual artifact check rejects invalid update reference entries", () => {
  const artifactDir = createArtifactDir("invalid-update-reference");

  try {
    writeVisualArtifactWithReferenceImportReport(
      artifactDir,
      createReferenceImportReportOverride(artifactDir, {
        status: "would-update",
        updateCount: 1,
        updates: [
          {
            component: "hero-banner",
            designReference:
              "docs/visual/page-builder-references/hero-banner-tablet.png",
            viewport: "desktop",
          },
        ],
      }),
    );

    const report = checkPageBuilderVisualArtifact({ artifactDir });

    assert.equal(report.status, "invalid");
    assert.equal(
      hasIssue(report, "invalid_reference_import_update_entry"),
      true,
    );
  } finally {
    rmSync(artifactDir, { force: true, recursive: true });
  }
});

test("visual artifact check rejects duplicate reference import entries", () => {
  const artifactDir = createArtifactDir("duplicate-reference-entry");

  try {
    writeVisualArtifactWithReferenceImportReport(
      artifactDir,
      createReferenceImportReportOverride(artifactDir, {
        missing: [
          createMissingReference("faq", "mobile"),
          createMissingReference("faq", "mobile"),
        ],
        missingCount: 2,
        status: "invalid",
      }),
    );

    const report = checkPageBuilderVisualArtifact({ artifactDir });

    assert.equal(report.status, "invalid");
    assert.equal(hasIssue(report, "duplicate_reference_import_entry"), true);
  } finally {
    rmSync(artifactDir, { force: true, recursive: true });
  }
});

test("visual artifact check rejects overlapping missing and update entries", () => {
  const artifactDir = createArtifactDir("overlapping-reference-entry");

  try {
    writeVisualArtifactWithReferenceImportReport(
      artifactDir,
      createReferenceImportReportOverride(artifactDir, {
        missing: [createMissingReference("faq", "mobile")],
        missingCount: 1,
        status: "invalid",
        updateCount: 1,
        updates: [
          {
            component: "faq",
            designReference:
              "docs/visual/page-builder-references/faq-mobile.png",
            viewport: "mobile",
          },
        ],
      }),
    );

    const report = checkPageBuilderVisualArtifact({ artifactDir });

    assert.equal(report.status, "invalid");
    assert.equal(hasIssue(report, "reference_import_report_mismatch"), true);
  } finally {
    rmSync(artifactDir, { force: true, recursive: true });
  }
});

function createReferenceImportReportOverride(artifactDir, override = {}) {
  return {
    complete: false,
    manifestPath: `${artifactDir}/page-builder-visual-acceptance.json`,
    missing: [],
    missingCount: 0,
    schemaVersion: "page-builder-visual-reference-import.v1",
    sourceDir: "docs/visual/page-builder-references",
    sourceDirStatus: "ready",
    status: "needs-evidence",
    updated: false,
    updateCount: 0,
    updates: [],
    ...override,
  };
}

function writeVisualArtifactWithReferenceImportReport(
  artifactDir,
  referenceImportReport,
) {
  writeVisualArtifact(artifactDir, {
    referenceImportMarkdown: createPageBuilderVisualReferenceImportMarkdown(
      referenceImportReport,
    ),
    referenceImportReport,
  });
}

function createMissingReference(component, viewport) {
  return {
    component,
    expectedPath: `docs/visual/page-builder-references/${component}-${viewport}.png`,
    reason: `${component}-${viewport}.png is missing`,
    viewport,
  };
}
