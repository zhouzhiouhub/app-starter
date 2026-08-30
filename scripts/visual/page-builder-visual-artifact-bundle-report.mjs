import {
  createPageBuilderVisualReferenceAcceptPassingCommand,
  createPageBuilderVisualReferenceAcceptanceCommand,
  createPageBuilderVisualReferenceCaptureCommand,
  createPageBuilderVisualReferenceImportWriteCommand,
  createPageBuilderVisualReferenceMeasureCommand,
} from "./page-builder-visual-reference-import-commands.mjs";

export function formatPageBuilderVisualArtifactBundleReport(result) {
  const lines = [
    "Page Builder visual artifact bundle",
    `Artifact dir: ${result.artifactDir}`,
    `Source manifest: ${result.sourceManifestPath}`,
    `Artifact manifest: ${result.paths.manifest}`,
    `Capture report: ${result.paths.captureReport}`,
    `Reference import report: ${result.paths.referenceImportReport}`,
    `Reference import Markdown: ${result.paths.referenceImportMarkdown}`,
    `Acceptance report: ${result.paths.acceptanceReport}`,
    `Acceptance Markdown: ${result.paths.acceptanceMarkdown}`,
    `Artifact check report: ${result.paths.artifactCheckReport}`,
    `Artifact check Markdown: ${result.paths.artifactCheckMarkdown}`,
    `Captured screenshots: ${result.capture.screenshots.length}`,
    `Reference import: ${result.referenceImport.status} (${result.referenceImport.updates.length} updates, ${result.referenceImport.missing.length} missing)`,
    `Measurement: ${result.measure.status} (${result.measure.measuredViewportCount}/${result.measure.targetViewportCount} measured, ${result.measure.missingViewportCount} missing)`,
    `Acceptance: ${result.acceptance.status} (${result.acceptance.acceptedComponentCount}/${result.acceptance.componentCount} components, ${result.acceptance.acceptedViewportCount}/${result.acceptance.viewportCount} viewports)`,
    `Artifact check: ${result.artifactCheck.status} (${result.artifactCheck.presentRequiredFileCount}/${result.artifactCheck.requiredFileCount} files, ${result.artifactCheck.presentScreenshotCount}/${result.artifactCheck.expectedScreenshotCount} screenshots)`,
  ];

  appendIssueLines(lines, "Measurement issues", result.measure.issues);
  appendIssueLines(lines, "Acceptance issues", result.acceptance.issues);
  appendIssueLines(lines, "Artifact issues", result.artifactCheck.issues);

  if (result.acceptance.status !== "accepted") {
    appendNextActionLines(lines, result);
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

function appendNextActionLines(lines, result) {
  const commandReport = {
    manifestPath: result.paths.manifest,
    sourceDir: result.referenceImport.sourceDir,
  };

  lines.push(
    "Next:",
    `  - Attach real design references under ${commandReport.sourceDir}.`,
    `  - Import references with \`${createPageBuilderVisualReferenceImportWriteCommand(
      commandReport,
    )}\`.`,
    `  - Refresh artifact screenshots with \`${createPageBuilderVisualReferenceCaptureCommand(
      commandReport,
    )}\`.`,
    `  - Measure artifact evidence with \`${createPageBuilderVisualReferenceMeasureCommand(
      commandReport,
    )}\`.`,
    `  - When review passes, mark passing evidence accepted with \`${createPageBuilderVisualReferenceAcceptPassingCommand(
      commandReport,
    )}\`.`,
    `  - Verify final sign-off with \`${createPageBuilderVisualReferenceAcceptanceCommand(
      commandReport,
    )}\`.`,
  );
}
