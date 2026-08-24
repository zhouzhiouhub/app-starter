import { posix, win32 } from "node:path";

const reportPathSegmentPattern = /^[A-Za-z0-9._-]+$/;
const reportPathRoots = new Set([".tmp", "artifacts", "reports", "tmp"]);

export function normalizeSmokeReportPath(value) {
  const issue = readSmokeReportPathIssue(value);

  if (issue) {
    throw new Error(readSmokeReportPathErrorMessage(issue));
  }

  return value.trim().replace(/\\/g, "/");
}

export function readSmokeReportPathIssue(value) {
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

  const normalized = trimmed.replace(/\\/g, "/");
  const segments = normalized.split("/");

  if (segments.length < 2 || !reportPathRoots.has(segments[0])) {
    return "unsafe-root";
  }

  if (
    segments.some(
      (segment) =>
        !segment ||
        segment === "." ||
        segment === ".." ||
        !reportPathSegmentPattern.test(segment),
    )
  ) {
    return "unsafe-segments";
  }

  if (!segments.at(-1).toLowerCase().endsWith(".json")) {
    return "non-json-extension";
  }

  return null;
}

function readSmokeReportPathErrorMessage(issue) {
  if (issue === "empty-path") {
    return "SMOKE_REPORT_PATH must not be empty.";
  }

  if (issue === "absolute-or-null-path" || issue === "invalid-path") {
    return "SMOKE_REPORT_PATH must be a relative JSON report path.";
  }

  if (issue === "unsafe-root") {
    return "SMOKE_REPORT_PATH must be under tmp/, reports/, artifacts/, or .tmp/.";
  }

  if (issue === "unsafe-segments") {
    return "SMOKE_REPORT_PATH must use safe path segments without traversal.";
  }

  return "SMOKE_REPORT_PATH must end with .json.";
}
