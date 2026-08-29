import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { normalizePathSeparators } from "../safe-path-separators.mjs";
import { defaultPageBuilderVisualAcceptanceManifestPath } from "./page-builder-visual-acceptance-constants.mjs";

const captureManifestPathRoots = [
  ".tmp",
  "artifacts/visual",
  "docs/development",
  "reports/visual",
  "tmp",
];
const unsafeManifestPathCharacters = new Set([":", "<", ">", '"', "'", "`"]);

export function readCaptureManifestPath(value) {
  const raw = value ?? defaultPageBuilderVisualAcceptanceManifestPath;

  if (typeof raw !== "string" || raw.trim() !== raw || !raw) {
    throw new Error("Visual capture manifest path must not be empty or padded.");
  }

  if (path.isAbsolute(raw) || path.win32.isAbsolute(raw) || hasProtocol(raw)) {
    throw new Error("Visual capture manifest path must be repository-relative.");
  }

  if (hasUnsafeManifestPathCharacter(raw)) {
    throw new Error("Visual capture manifest path has unsafe characters.");
  }

  const normalized = normalizePathSeparators(raw);
  const segments = normalized.split("/");

  if (segments.some((segment) => !segment || segment === "." || segment === "..")) {
    throw new Error("Visual capture manifest path has unsafe path segments.");
  }

  if (!captureManifestPathRoots.some((root) => isPathUnderRoot(normalized, root))) {
    throw new Error(
      `Visual capture manifest path must live under ${captureManifestPathRoots.join(
        ", ",
      )}.`,
    );
  }

  if (!normalized.toLowerCase().endsWith(".json")) {
    throw new Error("Visual capture manifest path must end with .json.");
  }

  return normalized;
}

export function updatePageBuilderVisualCaptureManifest(config, result, input = {}) {
  if (!config.writeManifest) {
    return null;
  }

  const manifestPath = readCaptureManifestPath(config.manifestPath);
  const manifest =
    input.manifest ?? JSON.parse(readFileSync(manifestPath, "utf8"));
  const updates = [];

  for (const screenshot of result.screenshots) {
    const record = findManifestRecord(manifest, screenshot.component);
    const evidence = record?.viewports?.[screenshot.viewport];

    if (!record || !evidence) {
      throw new Error(
        `Visual capture manifest is missing ${screenshot.component}.${screenshot.viewport}.`,
      );
    }

    updateViewportScreenshot(record, evidence, screenshot, updates);
  }

  if (updates.length > 0) {
    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  }

  return {
    manifestPath,
    updated: updates.length > 0,
    updates,
  };
}

function updateViewportScreenshot(record, evidence, screenshot, updates) {
  const nextPath = screenshot.evidencePath.replaceAll("\\", "/");
  const previousPath = evidence.previewScreenshot ?? null;
  const changed =
    previousPath !== nextPath ||
    evidence.maxColorDeltaE !== null ||
    evidence.maxLayoutDeltaPx !== null ||
    evidence.status !== "needs-evidence" ||
    evidence.visualMatchPercent !== null ||
    record.status !== "needs-evidence";

  if (!changed) {
    return;
  }

  evidence.maxColorDeltaE = null;
  evidence.maxLayoutDeltaPx = null;
  evidence.previewScreenshot = nextPath;
  evidence.status = "needs-evidence";
  evidence.visualMatchPercent = null;
  record.status = "needs-evidence";
  updates.push({
    component: screenshot.component,
    previewScreenshot: nextPath,
    viewport: screenshot.viewport,
  });
}

function findManifestRecord(manifest, component) {
  if (!Array.isArray(manifest?.records)) {
    return null;
  }

  return manifest.records.find((record) => record.component === component);
}

function hasProtocol(value) {
  return /^[a-z][a-z0-9+.-]*:/iu.test(value);
}

function hasUnsafeManifestPathCharacter(value) {
  for (const character of value) {
    if (character < " " || unsafeManifestPathCharacters.has(character)) {
      return true;
    }
  }

  return false;
}

function isPathUnderRoot(value, root) {
  return value === root || value.startsWith(`${root}/`);
}
