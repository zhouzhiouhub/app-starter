import { mkdir, writeFile } from "node:fs/promises";
import { dirname, posix, win32 } from "node:path";
import { normalizePathSeparators } from "../safe-path-separators.mjs";

export const defaultPageBuilderVisualMissingReferencesOutputPath =
  "artifacts/visual/page-builder-missing-references.txt";

const safeOutputPathRoots = new Set([".tmp", "artifacts", "reports", "tmp"]);
const safeOutputPathSegmentPattern = /^[A-Za-z0-9._-]+$/u;
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

export async function writePageBuilderVisualMissingReferencePaths(
  outputPath,
  artifact,
) {
  const missingReferences = Array.isArray(artifact.missing)
    ? artifact.missing
    : [];
  const content = missingReferences.length
    ? `${missingReferences.map((reference) => reference.expectedPath).join("\n")}\n`
    : "";

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, content, "utf8");
}

export function normalizeVisualReferenceMissingOutputPath(value) {
  if (typeof value !== "string") {
    throw new Error(
      "Visual reference missing paths output must be a repository-relative text path.",
    );
  }

  const raw = value.trim();

  if (
    !raw ||
    raw.includes("\0") ||
    posix.isAbsolute(raw) ||
    win32.isAbsolute(raw)
  ) {
    throw new Error(
      "Visual reference missing paths output must be a repository-relative text path.",
    );
  }

  if (/^[a-z][a-z0-9+.-]*:/iu.test(raw)) {
    throw new Error(
      "Visual reference missing paths output must be a repository-relative text path.",
    );
  }

  const normalized = normalizePathSeparators(raw);
  const segments = normalized.split("/");

  if (segments.length < 2 || !safeOutputPathRoots.has(segments[0])) {
    throw new Error(
      "Visual reference missing paths output must be under tmp/, reports/, artifacts/, or .tmp/.",
    );
  }

  if (segments.some((segment) => !isSafeOutputPathSegment(segment))) {
    throw new Error(
      "Visual reference missing paths output must use safe path segments without traversal.",
    );
  }

  if (!segments.at(-1).toLowerCase().endsWith(".txt")) {
    throw new Error("Visual reference missing paths output must end with .txt.");
  }

  return normalized;
}

function isSafeOutputPathSegment(segment) {
  return (
    Boolean(segment) &&
    segment !== "." &&
    segment !== ".." &&
    !segment.endsWith(".") &&
    !hasReservedWindowsBasename(segment) &&
    safeOutputPathSegmentPattern.test(segment)
  );
}

function hasReservedWindowsBasename(segment) {
  return reservedWindowsBasenames.has(segment.split(".")[0].toLowerCase());
}
