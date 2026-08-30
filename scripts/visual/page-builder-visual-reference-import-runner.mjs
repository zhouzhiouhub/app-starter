import { lstatSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  mvpPageBuilderComponents,
  pageBuilderVisualAcceptanceViewports,
} from "./page-builder-visual-acceptance-constants.mjs";

export function readPageBuilderVisualReferenceImportManifest(manifestPath) {
  return JSON.parse(readFileSync(manifestPath, "utf8"));
}

export function writePageBuilderVisualReferenceImportManifest(
  manifestPath,
  manifest,
) {
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
}

export function importPageBuilderVisualReferences(config, input = {}) {
  const cwd = input.cwd ?? process.cwd();
  const sourceManifest =
    input.manifest ??
    readPageBuilderVisualReferenceImportManifest(config.manifestPath);
  const manifest = config.write ? sourceManifest : structuredClone(sourceManifest);
  const referenceInput = readReferenceFiles(config.sourceDir, cwd);
  const updates = [];
  const missing = [];

  for (const component of mvpPageBuilderComponents) {
    const record = findRecord(manifest, component);

    for (const viewport of pageBuilderVisualAcceptanceViewports) {
      updateViewportReference({
        component,
        config,
        missing,
        record,
        references: referenceInput.files,
        sourceDirStatus: referenceInput.sourceDirStatus,
        updates,
        viewport,
      });
    }
  }

  if (config.write && updates.length > 0) {
    writePageBuilderVisualReferenceImportManifest(config.manifestPath, manifest);
  }

  return {
    complete: missing.length === 0,
    manifestPath: config.manifestPath,
    missing,
    sourceDir: config.sourceDir,
    sourceDirStatus: referenceInput.sourceDirStatus,
    status: readImportStatus(config, updates, missing),
    updated: config.write && updates.length > 0,
    updates,
  };
}

function updateViewportReference(input) {
  const evidence = input.record?.viewports?.[input.viewport];
  const file = input.references.get(
    createReferenceFileName(input.component, input.viewport),
  );

  if (!evidence) {
    input.missing.push({
      component: input.component,
      reason: "manifest viewport evidence slot is missing",
      viewport: input.viewport,
    });
    return;
  }

  if (input.sourceDirStatus !== "ready") {
    input.missing.push({
      component: input.component,
      reason: createSourceDirMissingReason(input.sourceDirStatus),
      viewport: input.viewport,
    });
    return;
  }

  if (!file) {
    input.missing.push({
      component: input.component,
      reason: `${createReferenceFileName(
        input.component,
        input.viewport,
      )} is missing`,
      viewport: input.viewport,
    });
    return;
  }

  if (file.empty) {
    input.missing.push({
      component: input.component,
      reason: `${file.name} must be a non-empty design PNG`,
      viewport: input.viewport,
    });
    return;
  }

  const nextPath = `${input.config.sourceDir}/${file.name}`;

  if (evidence.designReference === nextPath) {
    return;
  }

  evidence.designReference = nextPath;
  evidence.maxColorDeltaE = null;
  evidence.maxLayoutDeltaPx = null;
  evidence.status = "needs-evidence";
  evidence.visualMatchPercent = null;
  input.record.status = "needs-evidence";
  input.updates.push({
    component: input.component,
    designReference: nextPath,
    viewport: input.viewport,
  });
}

function readReferenceFiles(sourceDir, cwd) {
  const resolvedSourceDir = path.resolve(cwd, sourceDir);
  const files = new Map();
  const sourceDirStatus = readSourceDirStatus(resolvedSourceDir);

  if (sourceDirStatus !== "ready") {
    return { files, sourceDirStatus };
  }

  for (const entry of readdirSync(resolvedSourceDir, { withFileTypes: true })) {
    if (!entry.isFile() || path.extname(entry.name).toLowerCase() !== ".png") {
      continue;
    }

    files.set(entry.name, {
      empty: readFileSize(resolvedSourceDir, entry.name) <= 0,
      name: entry.name,
    });
  }

  return { files, sourceDirStatus };
}

function readFileSize(resolvedSourceDir, fileName) {
  return lstatSync(path.join(resolvedSourceDir, fileName)).size;
}

function readSourceDirStatus(resolvedSourceDir) {
  try {
    return lstatSync(resolvedSourceDir).isDirectory()
      ? "ready"
      : "not-directory";
  } catch {
    return "missing";
  }
}

function createSourceDirMissingReason(sourceDirStatus) {
  return sourceDirStatus === "not-directory"
    ? "source dir must be a directory"
    : "source dir is missing";
}

function findRecord(manifest, component) {
  if (!Array.isArray(manifest?.records)) {
    return null;
  }

  return manifest.records.find((record) => record.component === component);
}

function createReferenceFileName(component, viewport) {
  return `${component}-${viewport}.png`;
}

function readImportStatus(config, updates, missing) {
  if (config.requireComplete && missing.length > 0) {
    return "invalid";
  }

  if (updates.length > 0) {
    return config.write ? "updated" : "would-update";
  }

  return missing.length > 0 ? "needs-evidence" : "ready";
}
