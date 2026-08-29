export function formatPageBuilderVisualArtifactBundleReport(result) {
  const lines = [
    "Page Builder visual artifact bundle",
    `Artifact dir: ${result.artifactDir}`,
    `Source manifest: ${result.sourceManifestPath}`,
    `Artifact manifest: ${result.paths.manifest}`,
    `Capture report: ${result.paths.captureReport}`,
    `Acceptance report: ${result.paths.acceptanceReport}`,
    `Acceptance Markdown: ${result.paths.acceptanceMarkdown}`,
    `Artifact check Markdown: ${result.paths.artifactCheckMarkdown}`,
    `Captured screenshots: ${result.capture.screenshots.length}`,
    `Measurement: ${result.measure.status} (${result.measure.measuredViewportCount}/${result.measure.targetViewportCount} measured, ${result.measure.missingViewportCount} missing)`,
    `Acceptance: ${result.acceptance.status} (${result.acceptance.acceptedComponentCount}/${result.acceptance.componentCount} components, ${result.acceptance.acceptedViewportCount}/${result.acceptance.viewportCount} viewports)`,
    `Artifact check: ${result.artifactCheck.status} (${result.artifactCheck.presentRequiredFileCount}/${result.artifactCheck.requiredFileCount} files, ${result.artifactCheck.presentScreenshotCount}/${result.artifactCheck.expectedScreenshotCount} screenshots)`,
  ];

  appendIssueLines(lines, "Measurement issues", result.measure.issues);
  appendIssueLines(lines, "Acceptance issues", result.acceptance.issues);
  appendIssueLines(lines, "Artifact issues", result.artifactCheck.issues);

  if (result.acceptance.status !== "accepted") {
    lines.push(
      "Next: attach real design references, run `pnpm visual:measure -- --write --require-complete`, then review and mark passing evidence accepted.",
    );
  }

  return lines;
}

export function formatPageBuilderVisualArtifactBundleUsage() {
  return [
    "Usage:",
    "  pnpm visual:artifact-bundle",
    "  pnpm visual:artifact-bundle -- --artifact-dir reports/visual/page-builder-fixture",
    "  pnpm visual:artifact-bundle -- --skip-build --browser /path/to/chrome",
    "",
    "Options:",
    "  --artifact-dir <dir>      reports/visual or artifacts/visual bundle dir.",
    "  --source-manifest <path>  Source visual acceptance manifest JSON path.",
    "  --skip-build              Reuse the current Web build.",
    "  --start-timeout-ms <ms>   Web fixture startup timeout, 1000-120000.",
    "  --base-url <url>          Local http Web origin, default http://localhost:3000.",
    "  --browser <path>          Chrome or Edge executable path.",
    "  --timeout-ms <ms>         Browser screenshot timeout, 1000-120000.",
    "  -h, --help                Show this help.",
  ];
}

function appendIssueLines(lines, label, issues) {
  if (!Array.isArray(issues) || issues.length === 0) {
    return;
  }

  lines.push(`${label}:`);

  for (const issue of issues) {
    lines.push(`  - [${issue.severity}] ${issue.message}`);
  }
}
