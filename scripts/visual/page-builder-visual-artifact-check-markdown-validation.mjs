import {
  addArtifactCheckIssue,
  isObject,
  resolveRepositoryPath,
} from "./page-builder-visual-artifact-check-paths.mjs";

export function validateReferenceImportMarkdown(filePath, report, context) {
  const body = readRequiredText(filePath, "reference import Markdown", context);

  if (!body) {
    return;
  }

  validateReferenceImportMarkdownContent(body, report, context);
}

export function validateAcceptanceMarkdown(filePath, manifestReport, context) {
  const body = readRequiredText(filePath, "acceptance Markdown", context);

  if (!body) {
    return;
  }

  validateAcceptanceMarkdownContent(body, manifestReport, context);
}

function readRequiredText(filePath, label, context) {
  try {
    const resolvedPath = resolveRepositoryPath(context, filePath);
    const stats = context.stat(resolvedPath);

    if (!stats.isFile() || stats.size <= 0) {
      addArtifactCheckIssue(
        context,
        "invalid_artifact_file",
        `${label} must be a non-empty file.`,
      );
      return null;
    }

    context.presentRequiredFileCount += 1;
    return context.readFile(resolvedPath, "utf8");
  } catch {
    addArtifactCheckIssue(
      context,
      "missing_artifact_file",
      `${label} is missing: ${filePath}.`,
    );
    return null;
  }
}

function validateReferenceImportMarkdownContent(body, report, context) {
  const expectedLines = [
    [/^# Page Builder Visual Reference Import\r?$/mu, "title"],
    [
      /^Status: `(invalid|needs-evidence|ready|updated|would-update)`\r?$/mu,
      "status",
    ],
    [
      new RegExp(
        `^Manifest: \`${escapeRegExp(context.paths.manifest)}\`\\r?$`,
        "mu",
      ),
      "manifest path",
    ],
    [/^Source dir: `docs\/visual\/page-builder-references`\r?$/mu, "source dir"],
    ...createReferenceImportSourceDirStatusLines(report),
  ];

  validateExpectedMarkdownLines(
    body,
    expectedLines,
    "reference import Markdown",
    context,
  );
}

function createReferenceImportSourceDirStatusLines(report) {
  if (!isObject(report) || typeof report.sourceDirStatus !== "string") {
    return [];
  }

  return [
    [
      new RegExp(
        `^Source dir status: \`${escapeRegExp(report.sourceDirStatus)}\`\\r?$`,
        "mu",
      ),
      "source dir status",
    ],
  ];
}

function validateAcceptanceMarkdownContent(body, manifestReport, context) {
  const expectedLines = [
    [/^# Page Builder Visual Acceptance\r?$/mu, "title"],
    [
      new RegExp(
        `^Manifest: \`${escapeRegExp(context.paths.manifest)}\`\\r?$`,
        "mu",
      ),
      "manifest path",
    ],
    [
      new RegExp(
        `^Status: \`${readAcceptanceStatusPattern(manifestReport)}\`\\r?$`,
        "mu",
      ),
      "status",
    ],
    [
      new RegExp(
        `^Components accepted: ${readAcceptanceComponentCount(manifestReport)}\\r?$`,
        "mu",
      ),
      "component count",
    ],
    [
      new RegExp(
        `^Viewport evidence accepted: ${readAcceptanceViewportCount(manifestReport)}\\r?$`,
        "mu",
      ),
      "viewport count",
    ],
  ];

  validateExpectedMarkdownLines(
    body,
    expectedLines,
    "acceptance Markdown",
    context,
  );
}

function validateExpectedMarkdownLines(body, expectedLines, label, context) {
  for (const [pattern, lineLabel] of expectedLines) {
    if (!pattern.test(body)) {
      addArtifactCheckIssue(
        context,
        "invalid_artifact_markdown",
        `${label} must include the expected ${lineLabel}.`,
      );
    }
  }
}

function readAcceptanceStatusPattern(report) {
  return isObject(report)
    ? escapeRegExp(report.status)
    : "(invalid|needs-evidence|accepted)";
}

function readAcceptanceComponentCount(report) {
  return isObject(report)
    ? `${report.acceptedComponentCount}/${report.componentCount}`
    : "\\d+/\\d+";
}

function readAcceptanceViewportCount(report) {
  return isObject(report)
    ? `${report.acceptedViewportCount}/${report.viewportCount}`
    : "\\d+/\\d+";
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}
