import path from "node:path";
import {
  pageBuilderVisualAcceptanceViewports,
} from "./page-builder-visual-acceptance.mjs";
import { decodePngImage } from "./png-image-reader.mjs";
import {
  addArtifactCheckIssue,
  isObject,
  readErrorMessage,
  resolveRepositoryPath,
} from "./page-builder-visual-artifact-check-paths.mjs";

const allowedDesignReferenceRoots = [
  "artifacts/visual/",
  "docs/",
  "reports/visual/",
];

export function validateManifestDesignReferencePngs(manifest, context) {
  if (!isObject(manifest) || !Array.isArray(manifest.records)) {
    return;
  }

  for (const record of manifest.records) {
    validateRecordDesignReferencePngs(record, context);
  }
}

function validateRecordDesignReferencePngs(record, context) {
  if (!isObject(record) || typeof record.component !== "string") {
    return;
  }

  for (const viewport of pageBuilderVisualAcceptanceViewports) {
    const evidence = record.viewports?.[viewport];

    if (!isObject(evidence)) {
      continue;
    }

    validateDesignReferencePng(
      record.component,
      viewport,
      evidence.designReference,
      context,
    );
  }
}

function validateDesignReferencePng(component, viewport, value, context) {
  if (value === null || value === undefined || value === "") {
    return;
  }

  const evidencePath = readSafeDesignReferencePath(value);
  const label = `${component}.${viewport}`;

  if (!evidencePath) {
    addArtifactCheckIssue(
      context,
      "invalid_design_reference_path",
      `${label} designReference must be a retained relative PNG path.`,
    );
    return;
  }

  try {
    const resolvedPath = resolveRepositoryPath(context, evidencePath);
    const stats = context.stat(resolvedPath);

    if (!stats.isFile() || stats.size <= 0) {
      addArtifactCheckIssue(
        context,
        "invalid_design_reference_file",
        `${label} designReference must be a non-empty PNG file.`,
      );
      return;
    }

    decodePngImage(readReferenceBuffer(resolvedPath, context), evidencePath);
  } catch (error) {
    addArtifactCheckIssue(
      context,
      "invalid_design_reference_file",
      `${label} designReference is not a readable PNG file: ${readErrorMessage(
        error,
      )}`,
    );
  }
}

function readSafeDesignReferencePath(value) {
  if (typeof value !== "string" || value.trim() !== value || !value) {
    return null;
  }

  if (value.includes("\\") || path.isAbsolute(value) || hasProtocol(value)) {
    return null;
  }

  if (
    value
      .split("/")
      .some((segment) => !segment || segment === "." || segment === "..")
  ) {
    return null;
  }

  if (!value.endsWith(".png") || !hasAllowedDesignReferenceRoot(value)) {
    return null;
  }

  return value;
}

function hasAllowedDesignReferenceRoot(value) {
  return allowedDesignReferenceRoots.some((root) => value.startsWith(root));
}

function hasProtocol(value) {
  return /^[a-z][a-z0-9+.-]*:/iu.test(value);
}

function readReferenceBuffer(resolvedPath, context) {
  const body = context.readFile(resolvedPath);
  return Buffer.isBuffer(body) ? body : Buffer.from(body);
}
