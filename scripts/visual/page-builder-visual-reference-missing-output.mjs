import { mkdir, writeFile } from "node:fs/promises";
import { dirname, posix, win32 } from "node:path";
import { normalizePathSeparators } from "../safe-path-separators.mjs";

export const defaultPageBuilderVisualMissingReferencesOutputPath =
  "artifacts/visual/page-builder-missing-references.txt";
export const defaultPageBuilderVisualReferenceExportTableOutputPath =
  "artifacts/visual/page-builder-reference-export-table.tsv";
export const defaultPageBuilderVisualReferenceExportManifestOutputPath =
  "artifacts/visual/page-builder-reference-export-manifest.json";
export const pageBuilderVisualReferenceExportManifestSchemaVersion =
  "page-builder-visual-reference-export.v1";

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

export async function writePageBuilderVisualReferenceExportTable(
  outputPath,
  artifact,
) {
  const references = Array.isArray(artifact.requiredReferences)
    ? artifact.requiredReferences
    : [];
  const rows = [
    [
      "component",
      "viewport",
      "status",
      "reference_width",
      "reference_height",
      "expected_path",
      "preview_width",
      "preview_height",
      "preview_path",
    ],
    ...references.map(createReferenceExportTableRow),
  ];
  const content = `${rows
    .map((row) => row.map(formatTsvCell).join("\t"))
    .join("\n")}\n`;

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, content, "utf8");
}

export async function writePageBuilderVisualReferenceExportManifest(
  outputPath,
  artifact,
) {
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(
    outputPath,
    `${JSON.stringify(
      createPageBuilderVisualReferenceExportManifest(artifact),
      null,
      2,
    )}\n`,
    "utf8",
  );
}

export function createPageBuilderVisualReferenceExportManifest(artifact) {
  const references = Array.isArray(artifact.requiredReferences)
    ? artifact.requiredReferences
    : [];
  const missingReferences = references.filter(
    (reference) => reference.status === "missing",
  );

  return {
    complete: artifact.complete === true,
    generatedAt: artifact.generatedAt,
    manifestPath: artifact.manifestPath,
    missingCount: missingReferences.length,
    referenceCount: references.length,
    references: references.map(createReferenceExportManifestEntry),
    schemaVersion: pageBuilderVisualReferenceExportManifestSchemaVersion,
    sourceDir: artifact.sourceDir,
    status: readArtifactStatus(artifact),
  };
}

export function normalizeVisualReferenceMissingOutputPath(value) {
  return normalizeVisualReferenceOutputPath(value, {
    extension: ".txt",
    label: "Visual reference missing paths output",
  });
}

export function normalizeVisualReferenceExportTableOutputPath(value) {
  return normalizeVisualReferenceOutputPath(value, {
    extension: ".tsv",
    label: "Visual reference export table output",
  });
}

export function normalizeVisualReferenceExportManifestOutputPath(value) {
  return normalizeVisualReferenceOutputPath(value, {
    extension: ".json",
    label: "Visual reference export manifest output",
  });
}

function normalizeVisualReferenceOutputPath(value, options) {
  if (typeof value !== "string") {
    throw new Error(
      `${options.label} must be a repository-relative text path.`,
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
      `${options.label} must be a repository-relative text path.`,
    );
  }

  if (/^[a-z][a-z0-9+.-]*:/iu.test(raw)) {
    throw new Error(
      `${options.label} must be a repository-relative text path.`,
    );
  }

  const normalized = normalizePathSeparators(raw);
  const segments = normalized.split("/");

  if (segments.length < 2 || !safeOutputPathRoots.has(segments[0])) {
    throw new Error(
      `${options.label} must be under tmp/, reports/, artifacts/, or .tmp/.`,
    );
  }

  if (segments.some((segment) => !isSafeOutputPathSegment(segment))) {
    throw new Error(
      `${options.label} must use safe path segments without traversal.`,
    );
  }

  if (!segments.at(-1).toLowerCase().endsWith(options.extension)) {
    throw new Error(`${options.label} must end with ${options.extension}.`);
  }

  return normalized;
}

function createReferenceExportTableRow(reference) {
  const preview = reference.previewScreenshot ?? {};
  const size = readPreviewSize(preview);

  return [
    reference.component,
    reference.viewport,
    reference.status,
    size.width,
    size.height,
    reference.expectedPath,
    size.width,
    size.height,
    preview.path,
  ];
}

function createReferenceExportManifestEntry(reference) {
  const preview = reference.previewScreenshot ?? {};
  const size = readPreviewManifestSize(preview);

  return {
    component: reference.component,
    expectedPath: reference.expectedPath,
    fileName: `${reference.component}-${reference.viewport}.png`,
    referenceSize: {
      height: size.height,
      width: size.width,
    },
    ...(preview.path
      ? {
          previewScreenshot: {
            path: preview.path,
            ...(size.height ? { height: size.height } : {}),
            ...(size.width ? { width: size.width } : {}),
          },
        }
      : {}),
    ...(reference.reason ? { reason: reference.reason } : {}),
    status: reference.status,
    viewport: reference.viewport,
  };
}

function readPreviewSize(preview) {
  return {
    height: Number.isFinite(preview.height) ? preview.height : "",
    width: Number.isFinite(preview.width) ? preview.width : "",
  };
}

function readPreviewManifestSize(preview) {
  return {
    height: Number.isFinite(preview.height) ? preview.height : null,
    width: Number.isFinite(preview.width) ? preview.width : null,
  };
}

function readArtifactStatus(artifact) {
  return typeof artifact.status === "string" && artifact.status.length > 0
    ? artifact.status
    : artifact.complete === true
      ? "ready"
      : "needs-evidence";
}

function formatTsvCell(value) {
  return String(value ?? "").replace(/[\t\r\n]+/gu, " ").trim();
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
