import {
  formatManifestDesignReferenceLinks,
  formatRequiredSourceReferenceAvailability,
} from "./page-builder-visual-reference-summary-format.mjs";

export function formatPageBuilderVisualArtifactCheckReport(report) {
  const lines = [
    "Page Builder visual artifact check",
    `Status: ${report.status}`,
    `Artifact dir: ${report.artifactDir}`,
    `Issues: ${readIssueCount(report)}`,
    `Required files: ${report.presentRequiredFileCount}/${report.requiredFileCount}`,
    `Screenshots: ${report.presentScreenshotCount}/${report.expectedScreenshotCount}`,
    ...formatDesignReferences(report),
    ...formatReferenceImport(report.referenceImport),
  ];

  if (report.issues.length > 0) {
    lines.push("Issues:");

    for (const issue of report.issues) {
      lines.push(`  - [${issue.severity}] ${issue.message}`);
    }
  } else {
    lines.push("Artifact is complete for release evidence review.");
  }

  return lines;
}

function formatDesignReferences(report) {
  const links = formatManifestDesignReferenceLinks(report);

  if (!links) {
    return [];
  }

  return [`Manifest design references: ${links}`];
}

function formatReferenceImport(referenceImport) {
  if (!referenceImport) {
    return [];
  }

  const details = [
    formatReferenceImportSource(referenceImport),
    `${referenceImport.missingCount} missing`,
    `${referenceImport.updateCount} updates`,
    formatRequiredReferences(referenceImport),
    formatFirstMissingReferencePreview(referenceImport),
  ].filter(Boolean);

  return [
    `Reference import: ${referenceImport.status}${
      details.length > 0 ? ` (${details.join(", ")})` : ""
    }`,
    ...formatMissingReferences(referenceImport),
  ];
}

function formatFirstMissingReferencePreview(referenceImport) {
  return typeof referenceImport.firstMissingReferencePreview === "string" &&
    referenceImport.firstMissingReferencePreview.length > 0
    ? `first missing preview ${referenceImport.firstMissingReferencePreview}`
    : null;
}

function formatRequiredReferences(referenceImport) {
  return formatRequiredSourceReferenceAvailability(referenceImport, {
    includeStatusCounts: false,
  });
}

function formatMissingReferences(referenceImport) {
  const values = Array.isArray(referenceImport.missingReferences)
    ? referenceImport.missingReferences
    : [];

  return values.length > 0 ? [`Missing reference files: ${values.join(", ")}`] : [];
}

function formatReferenceImportSource(referenceImport) {
  return typeof referenceImport.sourceDirStatus === "string"
    ? `${referenceImport.sourceDirStatus} source`
    : null;
}

function readIssueCount(report) {
  if (Number.isFinite(report.issueCount)) {
    return report.issueCount;
  }

  return Array.isArray(report.issues) ? report.issues.length : 0;
}

export function formatPageBuilderVisualArtifactCheckUsage() {
  return [
    "Usage:",
    "  pnpm visual:artifact-check",
    "  pnpm visual:artifact-check -- --artifact-dir reports/visual/page-builder-fixture",
    "  pnpm visual:artifact-check -- --output reports/visual/page-builder-fixture/visual-artifact-check-report.json",
    "  pnpm visual:artifact-check -- --markdown-output reports/visual/page-builder-fixture/visual-artifact-check-report.md",
    "  pnpm visual:artifact-check -- --json",
    "",
  "Options:",
  "  --artifact-dir <dir>  Directory downloaded from Page Builder Visual.",
  "  --output <path>       Write a JSON artifact integrity report under tmp/, reports/, artifacts/, or .tmp/.",
  "  --markdown-output <path>",
    "                        Write a Markdown artifact integrity report under docs/visual, artifacts/visual, reports/visual, tmp/, or .tmp/.",
    "  --json                Print the machine-readable artifact check report.",
    "  -h, --help            Show this help.",
  ];
}
