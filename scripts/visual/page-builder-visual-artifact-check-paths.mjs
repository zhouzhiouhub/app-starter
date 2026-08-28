import path from "node:path";

export const artifactFileNames = {
  acceptanceReport: "visual-acceptance-report.json",
  captureReport: "visual-capture-report.json",
  manifest: "page-builder-visual-acceptance.json",
};

export function createArtifactPaths(artifactDir) {
  return Object.fromEntries(
    Object.entries(artifactFileNames).map(([key, fileName]) => [
      key,
      `${artifactDir}/${fileName}`,
    ]),
  );
}

export function readSafeArtifactEvidencePath(value, context) {
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

  if (!value.startsWith(`${context.artifactDir}/`) || !value.endsWith(".png")) {
    return null;
  }

  return value;
}

export function resolveRepositoryPath(context, relativePath) {
  const resolvedRoot = path.resolve(context.cwd);
  const resolvedPath = path.resolve(resolvedRoot, relativePath);

  if (!isPathInsideRoot(resolvedPath, resolvedRoot)) {
    throw new Error("Path escapes repository root.");
  }

  return resolvedPath;
}

export function addArtifactCheckIssue(context, code, message) {
  context.issues.push({ code, message, severity: "error" });
}

export function isObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

export function readErrorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

function hasProtocol(value) {
  return /^[a-z][a-z0-9+.-]*:/iu.test(value);
}

function isPathInsideRoot(resolvedPath, resolvedRoot) {
  const relative = path.relative(resolvedRoot, resolvedPath);
  return Boolean(relative) && !relative.startsWith("..") && !path.isAbsolute(relative);
}
