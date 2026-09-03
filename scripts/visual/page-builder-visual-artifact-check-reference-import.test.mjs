import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import test from "node:test";
import { checkPageBuilderVisualArtifact } from "./page-builder-visual-artifact-check.mjs";
import {
  createArtifactDir,
  hasIssue,
  writeVisualArtifact,
} from "./page-builder-visual-artifact-check-test-fixtures.mjs";
import {
  createPageBuilderVisualReferenceImportMarkdown,
} from "./page-builder-visual-reference-import.mjs";

test("visual artifact check rejects missing reference import Markdown", () => {
  const artifactDir = createArtifactDir("missing-reference-report");

  try {
    writeVisualArtifact(artifactDir);
    rmSync(`${artifactDir}/visual-reference-import-report.md`);

    const report = checkPageBuilderVisualArtifact({ artifactDir });
    assert.equal(report.status, "invalid");
    assert.equal(report.issueCount, report.issues.length);
    assert.equal(report.referenceImport.status, "invalid");
    assert.equal(report.referenceImport.missingCount, 12);
    assert.equal(report.presentRequiredFileCount, 5);
    assert.equal(
      report.issues.some(
        (issue) =>
          issue.code === "missing_artifact_file" &&
          issue.message.includes("reference import Markdown"),
      ),
      true,
    );
  } finally {
    rmSync(artifactDir, { force: true, recursive: true });
  }
});

test("visual artifact check rejects invalid reference import JSON", () => {
  const artifactDir = createArtifactDir("invalid-reference-json");

  try {
    writeVisualArtifact(artifactDir, {
      referenceImportReport: {
        schemaVersion: "wrong",
        manifestPath: "docs/development/page-builder-visual-acceptance.json",
        missing: [],
        missingCount: 1,
        sourceDir: "docs/visual/page-builder-references",
        updates: [],
        updateCount: 0,
      },
    });

    const report = checkPageBuilderVisualArtifact({ artifactDir });
    assert.equal(report.status, "invalid");
    assert.equal(hasIssue(report, "invalid_reference_import_schema"), true);
    assert.equal(hasIssue(report, "reference_import_report_mismatch"), true);
  } finally {
    rmSync(artifactDir, { force: true, recursive: true });
  }
});

test("visual artifact check accepts generated reference intake checklist", () => {
  const artifactDir = createArtifactDir("generated-reference-checklist");

  try {
    writeVisualArtifact(artifactDir);

    const report = checkPageBuilderVisualArtifact({ artifactDir });
    assert.equal(report.status, "complete");
    assert.equal(report.referenceImport.status, "invalid");
    assert.equal(report.referenceImport.missingCount, 12);
    assert.match(
      report.referenceImport.firstMissingReferencePreview,
      /reports\/visual\/artifact-check-generated-reference-checklist-.+\/page-builder-visual-fixture-hero-banner-desktop\.png \(1440x1000\)/,
    );
    assert.equal(report.referenceImport.requiredReferenceCount, 12);
    assert.equal(report.referenceImport.requiredReferenceEntryCount, 12);
    assert.deepEqual(report.referenceImport.requiredReferenceStatusCounts, {
      invalid: 0,
      missing: 12,
      ready: 0,
      updated: 0,
      wouldUpdate: 0,
    });
    assert.equal(
      hasIssue(report, "invalid_reference_import_required_entry"),
      false,
    );
  } finally {
    rmSync(artifactDir, { force: true, recursive: true });
  }
});

test("visual artifact check rejects incomplete reference intake checklist", () => {
  const artifactDir = createArtifactDir("incomplete-reference-checklist");
  const referenceImportReport = createReferenceImportReportOverride(
    artifactDir,
    {
      requiredReferenceCount: 12,
      requiredReferences: [],
    },
  );

  try {
    writeVisualArtifact(artifactDir, {
      referenceImportMarkdown:
        createPageBuilderVisualReferenceImportMarkdown(referenceImportReport),
      referenceImportReport,
    });

    const report = checkPageBuilderVisualArtifact({ artifactDir });
    assert.equal(report.status, "invalid");
    assert.equal(report.referenceImport.requiredReferenceCount, 12);
    assert.equal(report.referenceImport.requiredReferenceEntryCount, 0);
    assert.equal(
      hasIssue(report, "invalid_reference_import_required_entry"),
      true,
    );
  } finally {
    rmSync(artifactDir, { force: true, recursive: true });
  }
});

test("visual artifact check rejects invalid reference source dir status", () => {
  const artifactDir = createArtifactDir("invalid-reference-source-status");

  try {
    writeVisualArtifact(artifactDir, {
      referenceImportReport: createReferenceImportReportOverride(artifactDir, {
        sourceDirStatus: "unknown",
      }),
    });

    const report = checkPageBuilderVisualArtifact({ artifactDir });
    assert.equal(report.status, "invalid");
    assert.equal(hasIssue(report, "invalid_reference_source_dir_status"), true);
  } finally {
    rmSync(artifactDir, { force: true, recursive: true });
  }
});

test("visual artifact check rejects missing reference paths", () => {
  const artifactDir = createArtifactDir("missing-reference-paths");

  try {
    writeVisualArtifact(artifactDir, {
      referenceImportReport: createReferenceImportReportOverride(artifactDir, {
        missing: [
          {
            component: "faq",
            reason: "faq-mobile.png is missing",
            viewport: "mobile",
          },
        ],
        missingCount: 1,
        status: "invalid",
      }),
      referenceImportMarkdown: createReferenceImportMarkdownOverride(
        artifactDir,
        {
          missingCount: 1,
          status: "invalid",
        },
      ),
    });

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

test("visual artifact check rejects invalid reference import status", () => {
  const artifactDir = createArtifactDir("invalid-reference-import-status");

  try {
    writeVisualArtifact(artifactDir, {
      referenceImportReport: createReferenceImportReportOverride(artifactDir, {
        status: "complete",
      }),
      referenceImportMarkdown: createReferenceImportMarkdownOverride(
        artifactDir,
        { status: "complete" },
      ),
    });

    const report = checkPageBuilderVisualArtifact({ artifactDir });
    assert.equal(report.status, "invalid");
    assert.equal(hasIssue(report, "invalid_reference_import_status"), true);
  } finally {
    rmSync(artifactDir, { force: true, recursive: true });
  }
});

test("visual artifact check rejects stale reference source dir status Markdown", () => {
  const artifactDir = createArtifactDir("stale-reference-source-status");

  try {
    writeVisualArtifact(artifactDir, {
      referenceImportReport: createReferenceImportReportOverride(artifactDir, {
        sourceDirStatus: "missing",
      }),
      referenceImportMarkdown: createReferenceImportMarkdownOverride(
        artifactDir,
        { sourceDirStatus: "ready" },
      ),
    });

    const report = checkPageBuilderVisualArtifact({ artifactDir });
    assert.equal(report.status, "invalid");
    assert.equal(hasIssue(report, "invalid_artifact_markdown"), true);
  } finally {
    rmSync(artifactDir, { force: true, recursive: true });
  }
});

test("visual artifact check rejects stale reference import count Markdown", () => {
  const artifactDir = createArtifactDir("stale-reference-counts");

  try {
    writeVisualArtifact(artifactDir, {
      referenceImportReport: createReferenceImportReportOverride(artifactDir, {
        missing: [
          {
            component: "faq",
            expectedPath: "docs/visual/page-builder-references/faq-mobile.png",
            reason: "faq-mobile.png is missing",
            viewport: "mobile",
          },
        ],
        missingCount: 1,
        status: "invalid",
      }),
      referenceImportMarkdown: createReferenceImportMarkdownOverride(
        artifactDir,
        {
          missingCount: 0,
          status: "invalid",
        },
      ),
    });

    const report = checkPageBuilderVisualArtifact({ artifactDir });
    assert.equal(report.status, "invalid");
    assert.equal(hasIssue(report, "invalid_artifact_markdown"), true);
  } finally {
    rmSync(artifactDir, { force: true, recursive: true });
  }
});

test("visual artifact check rejects missing required source file Markdown", () => {
  const artifactDir = createArtifactDir("missing-source-file-checklist");

  try {
    writeVisualArtifact(artifactDir, {
      referenceImportMarkdown: createReferenceImportMarkdownOverride(
        artifactDir,
        {
          missingCount: 12,
          status: "invalid",
        },
      ),
    });

    const report = checkPageBuilderVisualArtifact({ artifactDir });
    assert.equal(report.status, "invalid");
    assert.equal(
      report.issues.some(
        (issue) =>
          issue.code === "invalid_artifact_markdown" &&
          issue.message.includes("required source files section"),
      ),
      true,
    );
  } finally {
    rmSync(artifactDir, { force: true, recursive: true });
  }
});

test("visual artifact check rejects stale reference import Markdown", () => {
  const artifactDir = createArtifactDir("stale-reference-report");

  try {
    writeVisualArtifact(artifactDir, {
      referenceImportMarkdown: [
        "# Page Builder Visual Reference Import",
        "",
        "Status: `invalid`",
        "Manifest: `docs/development/page-builder-visual-acceptance.json`",
        "Source dir: `docs/visual/page-builder-references`",
        "",
      ].join("\n"),
    });

    const report = checkPageBuilderVisualArtifact({ artifactDir });
    assert.equal(report.status, "invalid");
    assert.equal(hasIssue(report, "invalid_artifact_markdown"), true);
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

function createReferenceImportMarkdownOverride(artifactDir, override = {}) {
  const missingCount = override.missingCount ?? 0;
  const sourceDirStatus = override.sourceDirStatus ?? "ready";
  const status = override.status ?? "needs-evidence";
  const updateCount = override.updateCount ?? 0;

  return [
    "# Page Builder Visual Reference Import",
    "",
    `Status: \`${status}\``,
    `Manifest: \`${artifactDir}/page-builder-visual-acceptance.json\``,
    "Source dir: `docs/visual/page-builder-references`",
    `Source dir status: \`${sourceDirStatus}\``,
    `References updated: ${updateCount}`,
    `Missing references: ${missingCount}`,
    "",
  ].join("\n");
}
