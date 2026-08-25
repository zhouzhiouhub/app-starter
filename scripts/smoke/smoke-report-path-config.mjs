import { posix, win32 } from "node:path";

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
        hasReservedWindowsBasename(segment) ||
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

function hasReservedWindowsBasename(segment) {
  const basename = segment.split(".")[0].toLowerCase();
  return reservedWindowsBasenames.has(basename);
}
