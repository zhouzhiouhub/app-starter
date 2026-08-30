import { posix, win32 } from "node:path";
import { normalizePathSeparators } from "../safe-path-separators.mjs";
import { formatSmokeText } from "../smoke/smoke-text.mjs";

const outputPathRoots = new Set([".tmp", "artifacts", "docs", "reports", "tmp"]);
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
const safeArtifactNamePattern = /^[A-Za-z0-9._-]{1,160}$/u;
const safeLocalVerificationArtifactNamePattern =
  /^local-verification-[0-9]{1,20}$/u;
const safePathSegmentPattern = /^[A-Za-z0-9._-]+$/u;
const safeReleaseTagPattern = /^[A-Za-z0-9][A-Za-z0-9._-]{0,79}$/u;

export function normalizeReleaseNotesOutputPath(value) {
  return normalizeSafeRelativePath("Release notes output", value, {
    extension: ".md",
    requireReleaseSubdir: true,
  });
}

export function normalizeReleaseEvidencePath(value) {
  return normalizeSafeRelativePath("Release check artifact", value, {
    extension: ".json",
    requireReleaseSubdir: false,
  });
}

export function normalizeReleaseCheckMarkdownPath(value) {
  return normalizeSafeRelativePath("Release check Markdown", value, {
    extension: ".md",
    requireReleaseSubdir: true,
  });
}

export function normalizeProjectStatusPath(value) {
  return normalizeSafeRelativePath("Project status artifact", value, {
    extension: ".json",
    requireReleaseSubdir: false,
  });
}

export function normalizeProjectStatusMarkdownPath(value) {
  return normalizeSafeRelativePath("Project status Markdown", value, {
    extension: ".md",
    requireReleaseSubdir: true,
  });
}

export function normalizeReleaseTag(value) {
  const normalized = normalizePlainValue("release tag", value);

  if (!safeReleaseTagPattern.test(normalized)) {
    throw new Error(
      "Release tag must use 1-80 safe characters: letters, numbers, dot, underscore, or dash.",
    );
  }

  return normalized;
}

export function normalizeArtifactName(label, value) {
  const normalized = normalizePlainValue(label, value);

  if (!safeArtifactNamePattern.test(normalized)) {
    throw new Error(
      `${capitalize(label)} must use 1-160 safe characters: letters, numbers, dot, underscore, or dash.`,
    );
  }

  return normalized;
}

export function normalizeLocalVerificationArtifactName(value) {
  const normalized = normalizeArtifactName("local verification artifact", value);

  if (!safeLocalVerificationArtifactNamePattern.test(normalized)) {
    throw new Error(
      "Local verification artifact must use the local-verification-<run_number> naming pattern.",
    );
  }

  return normalized;
}

export function normalizeWorkflowRunUrl(value) {
  const url = normalizeHttpsUrl("workflow run URL", value);

  if (
    url.hostname !== "github.com" ||
    !/^\/[^/]+\/[^/]+\/actions\/runs\/[0-9]+$/u.test(url.pathname)
  ) {
    throw new Error(
      "Workflow run URL must be a GitHub Actions run URL without query or fragment.",
    );
  }

  return url.href;
}

export function normalizeStorefrontUrl(value) {
  const url = normalizeHttpsUrl("storefront URL", value);

  if (isReservedHost(url.hostname)) {
    throw new Error("Storefront URL must use a real production HTTPS host.");
  }

  return url.href;
}

export function normalizePlainValue(label, value) {
  const normalized = formatSmokeText(value, { maxLength: 240 });

  if (!normalized) {
    throw new Error(`${capitalize(label)} is required.`);
  }

  return normalized;
}

function normalizeSafeRelativePath(label, value, options) {
  const raw = normalizePlainValue(label, value);

  if (
    raw.includes("\0") ||
    posix.isAbsolute(raw) ||
    win32.isAbsolute(raw) ||
    hasProtocol(raw)
  ) {
    throw new Error(`${label} must be a repository-relative path.`);
  }

  const normalized = normalizePathSeparators(raw);
  const segments = normalized.split("/");

  if (!hasSafePathRoot(segments) || segments.some((segment) => !isSafePathSegment(segment))) {
    throw new Error(
      `${label} must use safe path segments under docs/releases, artifacts/release, reports/release, tmp/, or .tmp/.`,
    );
  }

  if (options.requireReleaseSubdir && !isReleaseOutputRoot(normalized)) {
    throw new Error(
      `${label} must be under docs/releases, artifacts/release, reports/release, tmp/, or .tmp/.`,
    );
  }

  if (!segments.at(-1).toLowerCase().endsWith(options.extension)) {
    throw new Error(`${label} must end with ${options.extension}.`);
  }

  return normalized;
}

function normalizeHttpsUrl(label, value) {
  const raw = normalizePlainValue(label, value);
  let url;

  try {
    url = new URL(raw);
  } catch {
    throw new Error(`${capitalize(label)} must be a valid HTTPS URL.`);
  }

  if (url.protocol !== "https:" || url.username || url.password) {
    throw new Error(`${capitalize(label)} must be a credential-free HTTPS URL.`);
  }

  if (url.search || url.hash) {
    throw new Error(`${capitalize(label)} must not include query or fragment.`);
  }

  return url;
}

function hasSafePathRoot(segments) {
  return segments.length >= 2 && outputPathRoots.has(segments[0]);
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

function isReleaseOutputRoot(path) {
  return (
    path.startsWith("docs/releases/") ||
    path.startsWith("artifacts/release/") ||
    path.startsWith("reports/release/") ||
    path.startsWith("tmp/") ||
    path.startsWith(".tmp/")
  );
}

function isReservedHost(hostname) {
  const lower = hostname.toLowerCase();

  return (
    lower === "localhost" ||
    lower === "127.0.0.1" ||
    lower === "::1" ||
    lower.endsWith(".localhost") ||
    lower.endsWith(".example") ||
    lower.endsWith(".test") ||
    lower.endsWith(".invalid") ||
    lower === "example.com"
  );
}

function hasProtocol(value) {
  return /^[a-z][a-z0-9+.-]*:/iu.test(value);
}

function hasReservedWindowsBasename(segment) {
  const basename = segment.split(".")[0].toLowerCase();
  return reservedWindowsBasenames.has(basename);
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
