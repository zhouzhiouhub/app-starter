import {
  addArtifactCheckIssue,
  isObject,
  resolveRepositoryPath,
} from "./page-builder-visual-artifact-check-paths.mjs";
import {
  mvpPageBuilderComponents,
  pageBuilderVisualAcceptanceViewports,
} from "./page-builder-visual-acceptance-constants.mjs";

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
    createReferenceImportStatusLine(report),
    [
      new RegExp(
        `^Manifest: \`${escapeRegExp(context.paths.manifest)}\`\\r?$`,
        "mu",
      ),
      "manifest path",
    ],
    [
      /^Source dir: `docs\/visual\/page-builder-references`\r?$/mu,
      "source dir",
    ],
    ...createReferenceImportSourceDirStatusLines(report),
    ...createReferenceImportCountLines(report),
    ...createReferenceImportRequiredSourceFileLines(report),
  ];

  validateExpectedMarkdownLines(
    body,
    expectedLines,
    "reference import Markdown",
    context,
  );
}

function createReferenceImportStatusLine(report) {
  const statusPattern =
    isObject(report) && typeof report.status === "string"
      ? escapeRegExp(report.status)
      : "(invalid|needs-evidence|ready|updated|would-update)";

  return [new RegExp(`^Status: \`${statusPattern}\`\\r?$`, "mu"), "status"];
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

function createReferenceImportCountLines(report) {
  if (!isObject(report)) {
    return [];
  }

  return [
    ...createReferenceImportCountLine(
      report.updateCount,
      "References updated",
      "update count",
    ),
    ...createReferenceImportCountLine(
      report.missingCount,
      "Missing references",
      "missing count",
    ),
  ];
}

function createReferenceImportCountLine(value, text, label) {
  if (!Number.isFinite(value)) {
    return [];
  }

  return [[new RegExp(`^${text}: ${value}\\r?$`, "mu"), label]];
}

function createReferenceImportRequiredSourceFileLines(report) {
  const missingByViewport = createReferenceLookup(report?.missing);
  const updatesByViewport = createReferenceLookup(report?.updates);

  return [
    [/^## Required Source Files\r?$/mu, "required source files section"],
    ...mvpPageBuilderComponents.flatMap((component) =>
      pageBuilderVisualAcceptanceViewports.map((viewport) =>
        createReferenceImportRequiredSourceFileLine({
          component,
          missing: missingByViewport.get(
            createReferenceKey(component, viewport),
          ),
          report,
          update: updatesByViewport.get(
            createReferenceKey(component, viewport),
          ),
          viewport,
        }),
      ),
    ),
  ];
}

function createReferenceImportRequiredSourceFileLine(input) {
  const status = readRequiredSourceFileStatus(input);
  const expectedPath = `docs/visual/page-builder-references/${input.component}-${input.viewport}.png`;

  return [
    new RegExp(
      `^- ${escapeRegExp(input.component)}\\.${escapeRegExp(
        input.viewport,
      )}: ${escapeRegExp(status)}; \`${escapeRegExp(expectedPath)}\`.*\\r?$`,
      "mu",
    ),
    `required source file ${input.component}.${input.viewport}`,
  ];
}

function readRequiredSourceFileStatus(input) {
  if (input.missing) {
    return "missing";
  }

  if (!input.update) {
    return "ready";
  }

  if (input.report?.status === "updated" || input.report?.updated === true) {
    return "updated";
  }

  return "would-update";
}

function createReferenceLookup(items) {
  const lookup = new Map();

  if (!Array.isArray(items)) {
    return lookup;
  }

  for (const item of items) {
    lookup.set(createReferenceKey(item.component, item.viewport), item);
  }

  return lookup;
}

function createReferenceKey(component, viewport) {
  return `${component}:${viewport}`;
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
