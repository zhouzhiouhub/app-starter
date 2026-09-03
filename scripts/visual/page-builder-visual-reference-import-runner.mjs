import { lstatSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  mvpPageBuilderComponents,
  pageBuilderVisualAcceptanceViewports,
} from "./page-builder-visual-acceptance-constants.mjs";
import { readPageBuilderVisualReferencePreviewScreenshot } from "./page-builder-visual-reference-preview-screenshot.mjs";
import {
  readPageBuilderVisualReferencePlaceholderIssue,
} from "./page-builder-visual-reference-placeholder.mjs";
import { readPngImage } from "./png-image-reader.mjs";

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
  const manifest = config.write
    ? sourceManifest
    : structuredClone(sourceManifest);
  const referenceInput = readReferenceFiles(config.sourceDir, cwd);
  const updates = [];
  const missing = [];

  for (const component of mvpPageBuilderComponents) {
    const record = findRecord(manifest, component);

    for (const viewport of pageBuilderVisualAcceptanceViewports) {
      updateViewportReference({
        component,
        config,
        cwd,
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
    writePageBuilderVisualReferenceImportManifest(
      config.manifestPath,
      manifest,
    );
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
  const previewScreenshot = readPageBuilderVisualReferencePreviewScreenshot(
    evidence,
    input.cwd,
  );
  const referenceInput = {
    ...input,
    previewScreenshot,
  };
  const file = input.references.get(
    createReferenceFileName(input.component, input.viewport),
  );

  if (!evidence) {
    addMissingReference(
      referenceInput,
      "manifest viewport evidence slot is missing",
    );
    return;
  }

  if (input.sourceDirStatus !== "ready") {
    addMissingReference(
      referenceInput,
      createSourceDirMissingReason(input.sourceDirStatus),
    );
    return;
  }

  if (!file) {
    addMissingReference(
      referenceInput,
      `${createReferenceFileName(input.component, input.viewport)} is missing`,
    );
    return;
  }

  if (file.empty) {
    addMissingReference(
      referenceInput,
      `${file.name} must be a non-empty design PNG`,
    );
    return;
  }

  if (file.pngError) {
    addMissingReference(
      referenceInput,
      `${file.name} must be a readable PNG: ${file.pngError}`,
    );
    return;
  }

  if (file.placeholderIssue) {
    addMissingReference(referenceInput, `${file.name} ${file.placeholderIssue}`);
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
    ...(previewScreenshot ? { previewScreenshot } : {}),
    viewport: input.viewport,
  });
}

function addMissingReference(input, reason) {
  input.missing.push({
    component: input.component,
    expectedPath: createExpectedReferencePath(
      input.config.sourceDir,
      input.component,
      input.viewport,
    ),
    ...(input.previewScreenshot
      ? { previewScreenshot: input.previewScreenshot }
      : {}),
    reason,
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
    const filePath = path.join(resolvedSourceDir, entry.name);
    const size = readFileSize(filePath);
    const pngValidation =
      size <= 0 ? emptyPngValidation() : readReferencePngValidation(filePath);

    files.set(entry.name, {
      empty: size <= 0,
      name: entry.name,
      placeholderIssue: pngValidation.placeholderIssue,
      pngError: pngValidation.pngError,
    });
  }

  return { files, sourceDirStatus };
}

function readFileSize(filePath) {
  return lstatSync(filePath).size;
}

function readReferencePngValidation(filePath) {
  try {
    const image = readPngImage(filePath);

    return {
      placeholderIssue: readPageBuilderVisualReferencePlaceholderIssue(image),
      pngError: null,
    };
  } catch (error) {
    return {
      placeholderIssue: null,
      pngError: readErrorMessage(error),
    };
  }
}

function emptyPngValidation() {
  return {
    placeholderIssue: null,
    pngError: null,
  };
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

function createExpectedReferencePath(sourceDir, component, viewport) {
  return `${sourceDir}/${createReferenceFileName(component, viewport)}`;
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

function readErrorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}
