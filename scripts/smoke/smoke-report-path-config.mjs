import { posix, win32 } from "node:path";

const reportPathSegmentPattern = /^[A-Za-z0-9._-]+$/;
const reportPathRoots = new Set([".tmp", "artifacts", "reports", "tmp"]);

export function normalizeSmokeReportPath(value) {
  const trimmed = value.trim();

  if (!trimmed) {
    throw new Error("SMOKE_REPORT_PATH must not be empty.");
  }

  if (
    trimmed.includes("\0") ||
    posix.isAbsolute(trimmed) ||
    win32.isAbsolute(trimmed)
  ) {
    throw new Error("SMOKE_REPORT_PATH must be a relative JSON report path.");
  }

  const normalized = trimmed.replace(/\\/g, "/");
  const segments = normalized.split("/");

  if (segments.length < 2 || !reportPathRoots.has(segments[0])) {
    throw new Error(
      "SMOKE_REPORT_PATH must be under tmp/, reports/, artifacts/, or .tmp/.",
    );
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
    throw new Error(
      "SMOKE_REPORT_PATH must use safe path segments without traversal.",
    );
  }

  if (!segments.at(-1).toLowerCase().endsWith(".json")) {
    throw new Error("SMOKE_REPORT_PATH must end with .json.");
  }

  return normalized;
}
