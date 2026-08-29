import { posix, win32 } from "node:path";
import { normalizePathSeparators } from "../safe-path-separators.mjs";

const reportPathSegmentPattern = /^[A-Za-z0-9._-]+$/;
const reportPathRoots = new Set([".tmp", "artifacts", "reports", "tmp"]);
const reservedWindowsBasenames = new Set([
  "aux",
  "con",
  "com1",
  "com2",
  "com3",
  "com4",
  "com5",
  "com6",
  "com7",
  "com8",
  "com9",
  "lpt1",
  "lpt2",
  "lpt3",
  "lpt4",
  "lpt5",
  "lpt6",
  "lpt7",
  "lpt8",
  "lpt9",
  "nul",
  "prn",
]);

export function normalizeSmokeReportPath(value) {
  const issue = readSmokeReportPathIssue(value);

  if (issue) {
    throw new Error(readSmokeReportPathErrorMessage(issue));
  }

  return normalizePathSeparators(value);
}

export function normalizeSmokeReportMarkdownPath(value) {
  const context = {
    extension: ".md",
    extensionIssue: "non-markdown-extension",
    label: "Smoke report Markdown",
    relativeDescription: "relative Markdown report path",
  };
  const issue = readSmokeReportPathIssue(value, context);

  if (issue) {
    throw new Error(readSmokeReportPathErrorMessage(issue, context));
  }

  return normalizePathSeparators(value);
}

export function readSmokeReportPathIssue(value, options = {}) {
  const context = createPathIssueContext(options);

  if (typeof value !== "string") {
    return "invalid-path";
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return "empty-path";
  }

  if (
    trimmed.includes("\0") ||
    posix.isAbsolute(trimmed) ||
    win32.isAbsolute(trimmed)
  ) {
    return "absolute-or-null-path";
  }

  const normalized = normalizePathSeparators(trimmed);
  const segments = normalized.split("/");

  if (segments.length < 2 || !reportPathRoots.has(segments[0])) {
    return "unsafe-root";
  }

  if (
    segments.some(
      (segment, index) =>
        !segment ||
        segment === "." ||
          segment === ".." ||
          hasReservedWindowsBasename(segment) ||
          hasReportIntermediateSegment(segment, index, segments.length, context) ||
          hasTrailingDotSegment(segment) ||
          !reportPathSegmentPattern.test(segment),
    )
  ) {
    return "unsafe-segments";
  }

  if (!segments.at(-1).toLowerCase().endsWith(context.extension)) {
    return context.extensionIssue;
  }

  return null;
}

function readSmokeReportPathErrorMessage(issue, options = {}) {
  const context = createPathIssueContext(options);

  if (issue === "empty-path") {
    return `${context.label} must not be empty.`;
  }

  if (issue === "absolute-or-null-path" || issue === "invalid-path") {
    return `${context.label} must be a ${context.relativeDescription}.`;
  }

  if (issue === "unsafe-root") {
    return `${context.label} must be under tmp/, reports/, artifacts/, or .tmp/.`;
  }

  if (issue === "unsafe-segments") {
    return `${context.label} must use safe path segments without traversal.`;
  }

  return `${context.label} must end with ${context.extension}.`;
}

function hasReservedWindowsBasename(segment) {
  const basename = segment.split(".")[0].toLowerCase();
  return reservedWindowsBasenames.has(basename);
}

function hasReportIntermediateSegment(segment, index, segmentCount, context) {
  return (
    index < segmentCount - 1 &&
    segment.toLowerCase().endsWith(context.extension)
  );
}

function hasTrailingDotSegment(segment) {
  return segment.endsWith(".");
}

function createPathIssueContext(options) {
  return {
    extension: options.extension ?? ".json",
    extensionIssue: options.extensionIssue ?? "non-json-extension",
    label: options.label ?? "SMOKE_REPORT_PATH",
    relativeDescription:
      options.relativeDescription ?? "relative JSON report path",
  };
}
