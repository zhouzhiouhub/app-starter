import { posix, win32 } from "node:path";
import { normalizePathSeparators } from "../safe-path-separators.mjs";
import { readErrorMessage } from "../smoke/smoke-error-message.mjs";
import { normalizeSmokeReportPath } from "../smoke/smoke-report-path-config.mjs";

const markdownRoots = [
  ".tmp/",
  "artifacts/visual/",
  "docs/visual/",
  "reports/visual/",
  "tmp/",
];
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
const safePathSegmentPattern = /^[A-Za-z0-9._-]+$/u;

export function normalizeVisualAcceptanceOutputPath(value) {
  try {
    return normalizeSmokeReportPath(value);
  } catch (error) {
    throw new Error(
      readErrorMessage(error).replaceAll(
        "SMOKE_REPORT_PATH",
        "Visual acceptance output",
      ),
    );
  }
}

export function normalizeVisualAcceptanceMarkdownOutputPath(value) {
  if (typeof value !== "string") {
    throw new Error(
      "Visual acceptance Markdown must be a repository-relative Markdown path.",
    );
  }

  const raw = value.trim();

  if (!raw) {
    throw new Error("Visual acceptance Markdown must not be empty.");
  }

  if (raw.includes("\0") || posix.isAbsolute(raw) || win32.isAbsolute(raw)) {
    throw new Error(
      "Visual acceptance Markdown must be a repository-relative Markdown path.",
    );
  }

  if (hasProtocol(raw)) {
    throw new Error(
      "Visual acceptance Markdown must be a repository-relative Markdown path.",
    );
  }

  const normalized = normalizePathSeparators(raw);
  const segments = normalized.split("/");

  if (!markdownRoots.some((root) => normalized.startsWith(root))) {
    throw new Error(
      "Visual acceptance Markdown must be under docs/visual, artifacts/visual, reports/visual, tmp/, or .tmp/.",
    );
  }

  if (segments.some((segment) => !isSafePathSegment(segment))) {
    throw new Error(
      "Visual acceptance Markdown must use safe path segments without traversal.",
    );
  }

  if (!segments.at(-1).toLowerCase().endsWith(".md")) {
    throw new Error("Visual acceptance Markdown must end with .md.");
  }

  return normalized;
}

function isSafePathSegment(segment) {
  return (
    Boolean(segment) &&
    segment !== "." &&
    segment !== ".." &&
    !hasReservedWindowsBasename(segment) &&
    !segment.endsWith(".") &&
    safePathSegmentPattern.test(segment)
  );
}

function hasProtocol(value) {
  return /^[a-z][a-z0-9+.-]*:/iu.test(value);
}

function hasReservedWindowsBasename(segment) {
  const basename = segment.split(".")[0].toLowerCase();
  return reservedWindowsBasenames.has(basename);
}
