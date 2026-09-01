import { posix, win32 } from "node:path";
import {
  normalizeDirectoryPathSeparators,
  normalizePathSeparators,
} from "../safe-path-separators.mjs";
import { defaultPageBuilderVisualReferenceSourceDir } from "./page-builder-visual-acceptance-constants.mjs";

export const defaultPageBuilderVisualReferenceHandoffOutputDir =
  "artifacts/visual/page-builder-reference-handoff";
export const defaultPageBuilderVisualReferenceHandoffManifestPath =
  "reports/visual/page-builder-fixture/page-builder-visual-acceptance.json";
export const pageBuilderVisualReferenceHandoffSchemaVersion =
  "page-builder-visual-reference-handoff.v1";

const safeOutputRoots = new Set([".tmp", "artifacts", "reports", "tmp"]);
const safePreviewRoots = [
  ".tmp/",
  "artifacts/visual/",
  "docs/visual/",
  "reports/visual/",
  "tmp/",
];
const safePathSegmentPattern = /^[A-Za-z0-9._-]+$/u;
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

export function createPageBuilderVisualReferenceHandoffCommand(input = {}) {
  const context = {
    manifestPath:
      input.manifestPath ?? defaultPageBuilderVisualReferenceHandoffManifestPath,
    outputDir:
      input.outputDir ?? defaultPageBuilderVisualReferenceHandoffOutputDir,
    sourceDir: input.sourceDir ?? defaultPageBuilderVisualReferenceSourceDir,
  };

  if (
    context.manifestPath === defaultPageBuilderVisualReferenceHandoffManifestPath &&
    context.outputDir === defaultPageBuilderVisualReferenceHandoffOutputDir &&
    context.sourceDir === defaultPageBuilderVisualReferenceSourceDir
  ) {
    return "pnpm visual:references:handoff";
  }

  return [
    "pnpm visual:references:handoff",
    "--",
    ...(context.sourceDir === defaultPageBuilderVisualReferenceSourceDir
      ? []
      : ["--source-dir", context.sourceDir]),
    ...(context.manifestPath ===
    defaultPageBuilderVisualReferenceHandoffManifestPath
      ? []
      : ["--manifest", context.manifestPath]),
    "--output-dir",
    context.outputDir,
  ].join(" ");
}

export function createPageBuilderVisualReferenceHandoffOutputPaths(outputDir) {
  return {
    exportManifest: `${outputDir}/page-builder-reference-export-manifest.json`,
    handoffManifest: `${outputDir}/page-builder-reference-handoff.json`,
    missingPaths: `${outputDir}/page-builder-missing-references.txt`,
    previewDir: `${outputDir}/preview-screenshots`,
    requestMarkdown: `${outputDir}/page-builder-reference-request.md`,
    table: `${outputDir}/page-builder-reference-export-table.tsv`,
  };
}

export function normalizeVisualReferenceHandoffOutputDir(value) {
  if (typeof value !== "string") {
    throw new Error(
      "Visual reference handoff output dir must be a repository-relative directory.",
    );
  }

  const raw = value.trim();

  if (
    !raw ||
    raw.includes("\0") ||
    posix.isAbsolute(raw) ||
    win32.isAbsolute(raw) ||
    /^[a-z][a-z0-9+.-]*:/iu.test(raw)
  ) {
    throw new Error(
      "Visual reference handoff output dir must be a repository-relative directory.",
    );
  }

  const normalized = normalizeDirectoryPathSeparators(raw).replace(/^\.\//u, "");
  const segments = normalized.split("/");

  if (segments.length < 2 || !safeOutputRoots.has(segments[0])) {
    throw new Error(
      "Visual reference handoff output dir must be under artifacts/, reports/, tmp/, or .tmp/.",
    );
  }

  if (segments.some((segment) => !isSafePathSegment(segment))) {
    throw new Error(
      "Visual reference handoff output dir must use safe path segments without traversal.",
    );
  }

  return normalized;
}

export function normalizePreviewScreenshotSourcePath(value) {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error("preview screenshot path is missing");
  }

  const raw = value.trim();

  if (
    raw !== value ||
    raw.includes("\0") ||
    posix.isAbsolute(raw) ||
    win32.isAbsolute(raw) ||
    /^[a-z][a-z0-9+.-]*:/iu.test(raw)
  ) {
    throw new Error("preview screenshot path must be repository-relative");
  }

  const normalized = normalizePathSeparators(raw);

  if (!safePreviewRoots.some((root) => normalized.startsWith(root))) {
    throw new Error("preview screenshot path must be under visual artifacts");
  }

  if (normalized.split("/").some((segment) => !isSafePathSegment(segment))) {
    throw new Error("preview screenshot path must use safe path segments");
  }

  if (!normalized.toLowerCase().endsWith(".png")) {
    throw new Error("preview screenshot path must end with .png");
  }

  return normalized;
}

function isSafePathSegment(segment) {
  return (
    Boolean(segment) &&
    segment !== "." &&
    segment !== ".." &&
    !segment.endsWith(".") &&
    !hasReservedWindowsBasename(segment) &&
    safePathSegmentPattern.test(segment)
  );
}

function hasReservedWindowsBasename(segment) {
  return reservedWindowsBasenames.has(segment.split(".")[0].toLowerCase());
}
