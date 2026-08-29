export function formatPageBuilderVisualArtifactCheckReport(report) {
  const lines = [
    "Page Builder visual artifact check",
    `Status: ${report.status}`,
    `Artifact dir: ${report.artifactDir}`,
    `Required files: ${report.presentRequiredFileCount}/${report.requiredFileCount}`,
    `Screenshots: ${report.presentScreenshotCount}/${report.expectedScreenshotCount}`,
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

export function formatPageBuilderVisualArtifactCheckUsage() {
  return [
    "Usage:",
    "  pnpm visual:artifact-check",
    "  pnpm visual:artifact-check -- --artifact-dir reports/visual/page-builder-fixture",
    "  pnpm visual:artifact-check -- --markdown-output reports/visual/page-builder-fixture/visual-artifact-check-report.md",
    "  pnpm visual:artifact-check -- --json",
    "",
    "Options:",
    "  --artifact-dir <dir>  Directory downloaded from Page Builder Visual.",
    "  --markdown-output <path>",
    "                        Write a Markdown artifact integrity report under docs/visual, artifacts/visual, reports/visual, tmp/, or .tmp/.",
    "  --json                Print the machine-readable artifact check report.",
    "  -h, --help            Show this help.",
  ];
}
