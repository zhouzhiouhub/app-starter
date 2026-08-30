import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { formatSmokeText } from "../smoke/smoke-text.mjs";
import { createArtifactPaths } from "./page-builder-visual-artifact-check-paths.mjs";

const maxMarkdownTextLength = 420;

export function createPageBuilderVisualArtifactCheckMarkdown(report) {
  const paths = createArtifactPaths(report.artifactDir);
  const lines = [
    "# Page Builder Visual Artifact Check",
    "",
    `Artifact dir: ${formatCode(report.artifactDir)}`,
    `Status: ${formatCode(report.status)}`,
    `Required files: ${report.presentRequiredFileCount}/${report.requiredFileCount}`,
    `Screenshots: ${report.presentScreenshotCount}/${report.expectedScreenshotCount}`,
    ...formatDesignReferences(report),
    "",
    "## Required Files",
    "",
    `- Artifact manifest: ${formatCode(paths.manifest)}`,
    `- Capture report: ${formatCode(paths.captureReport)}`,
    `- Reference import report: ${formatCode(paths.referenceImportReport)}`,
    `- Acceptance report: ${formatCode(paths.acceptanceReport)}`,
    `- Acceptance Markdown: ${formatCode(paths.acceptanceMarkdown)}`,
    `- Reference import Markdown: ${formatCode(paths.referenceImportMarkdown)}`,
    "",
    "## Issues",
    "",
    ...formatIssues(report.issues),
    "",
    "## Next Step",
    "",
    ...formatNextStep(report),
    "",
  ];

  return `${lines.join("\n")}\n`;
}

function formatDesignReferences(report) {
  if (
    !Number.isFinite(report.presentDesignReferenceCount) ||
    !Number.isFinite(report.referencedDesignReferenceCount)
  ) {
    return [];
  }

  return [
    `Design references: ${report.presentDesignReferenceCount}/${report.referencedDesignReferenceCount}`,
  ];
}

export async function writePageBuilderVisualArtifactCheckMarkdown(
  outputPath,
  report,
) {
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(
    outputPath,
    createPageBuilderVisualArtifactCheckMarkdown(report),
    "utf8",
  );
}

function formatIssues(issues) {
  if (!Array.isArray(issues) || issues.length === 0) {
    return ["- None"];
  }

  return issues.map(
    (issue) =>
      `- [${formatText(issue.severity)}] ${formatText(issue.code)}: ${formatText(
        issue.message,
      )}`,
  );
}

function formatNextStep(report) {
  if (report.status === "complete") {
    return [
      "- Keep this bundle with the release evidence review.",
      "- Final MVP visual sign-off still requires real design references and `pnpm visual:acceptance -- --require-accepted`.",
    ];
  }

  return [
    "- Fix the artifact issues above.",
    "- Rerun `pnpm visual:artifact-bundle -- --artifact-dir reports/visual/page-builder-fixture`.",
    "- Rerun `pnpm visual:artifact-check -- --artifact-dir reports/visual/page-builder-fixture --output reports/visual/page-builder-fixture/visual-artifact-check-report.json --markdown-output reports/visual/page-builder-fixture/visual-artifact-check-report.md`.",
  ];
}

function formatCode(value) {
  return `\`${formatText(value).replaceAll("`", "'")}\``;
}

function formatText(value) {
  return formatSmokeText(value, {
    fallback: "unknown",
    maxLength: maxMarkdownTextLength,
  });
}
