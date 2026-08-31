import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { formatSmokeText } from "../smoke/smoke-text.mjs";
import { createArtifactPaths } from "./page-builder-visual-artifact-check-paths.mjs";
import {
  formatManifestDesignReferenceLinks,
  formatRequiredSourceReferenceAvailability,
} from "./page-builder-visual-reference-summary-format.mjs";

const maxMarkdownTextLength = 420;
const maxReferencePathPreviewCount = 4;

export function createPageBuilderVisualArtifactCheckMarkdown(report) {
  const paths = createArtifactPaths(report.artifactDir);
  const lines = [
    "# Page Builder Visual Artifact Check",
    "",
    `Artifact dir: ${formatCode(report.artifactDir)}`,
    `Status: ${formatCode(report.status)}`,
    `Issues: ${readIssueCount(report)}`,
    `Required files: ${report.presentRequiredFileCount}/${report.requiredFileCount}`,
    `Screenshots: ${report.presentScreenshotCount}/${report.expectedScreenshotCount}`,
    ...formatDesignReferences(report),
    ...formatReferenceImport(report.referenceImport),
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

  return [
    `Reference import: ${formatCode(referenceImport.status)}`,
    `Reference source dir: ${formatNullableCode(
      referenceImport.sourceDir,
    )} (${formatText(referenceImport.sourceDirStatus)})`,
    `Reference missing: ${referenceImport.missingCount}`,
    ...formatMissingReferences(referenceImport),
    `Reference updates: ${referenceImport.updateCount}`,
    ...formatRequiredReferences(referenceImport),
  ];
}

function formatMissingReferences(referenceImport) {
  if ((referenceImport.missingCount ?? 0) === 0) {
    return [];
  }

  const values = Array.isArray(referenceImport.missingReferences)
    ? referenceImport.missingReferences
    : [];

  if (values.length === 0) {
    return ["Reference missing files: not recorded"];
  }

  const visible = values.slice(0, maxReferencePathPreviewCount).map(formatCode);
  const hidden = referenceImport.missingCount - visible.length;
  return [
    `Reference missing files: ${visible.join(", ")}${hidden > 0 ? `, ... and ${hidden} more` : ""}`,
  ];
}

function formatRequiredReferences(referenceImport) {
  const coverage = formatRequiredSourceReferenceAvailability(referenceImport, {
    includeNoun: false,
  });

  return coverage ? [`Required source references: ${coverage}`] : [];
}

function formatNullableCode(value) {
  return typeof value === "string" && value.length > 0
    ? formatCode(value)
    : formatText(value);
}

function readIssueCount(report) {
  if (Number.isFinite(report.issueCount)) {
    return report.issueCount;
  }

  return Array.isArray(report.issues) ? report.issues.length : 0;
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
