import { createVisualAcceptanceIssue } from "./page-builder-visual-acceptance-targets.mjs";

const imageEvidenceExtensions = new Set([".jpeg", ".jpg", ".png", ".webp"]);
const unsafeEvidencePathCharacters = new Set(["<", ">", '"', "'", "`", "\\"]);
const evidencePathRootsByField = {
  designReference: ["artifacts/visual/", "docs/", "reports/visual/"],
  previewScreenshot: ["artifacts/visual/", "reports/visual/"],
};

export function validateVisualAcceptanceEvidencePath(input, context) {
  const value = input.value;

  if (typeof value !== "string" || !value.trim()) {
    context.issues.push(
      createVisualAcceptanceIssue(
        "error",
        "missing_evidence_path",
        `${formatEvidenceField(input)} is required for accepted evidence.`,
        input.component,
        input.viewport,
      ),
    );
    return false;
  }

  if (!isSafeEvidencePath(value, input.field)) {
    context.issues.push(
      createVisualAcceptanceIssue(
        "error",
        "invalid_evidence_path",
        `${formatEvidenceField(
          input,
        )} must be a retained relative image path under ${formatAllowedRoots(
          input.field,
        )}.`,
        input.component,
        input.viewport,
      ),
    );
    return false;
  }

  return true;
}

function isSafeEvidencePath(value, field) {
  const path = value.trim();

  return (
    path === value &&
    !hasProtocol(path) &&
    !path.startsWith("/") &&
    !path.startsWith(".") &&
    !hasUnsafePathSegment(path) &&
    !hasUnsafeCharacter(path) &&
    hasAllowedRoot(path, field) &&
    hasImageEvidenceExtension(path)
  );
}

function hasProtocol(value) {
  return /^[a-z][a-z0-9+.-]*:/i.test(value);
}

function hasUnsafePathSegment(value) {
  return value.split("/").some((segment) => segment === "" || segment === "..");
}

function hasUnsafeCharacter(value) {
  for (const character of value) {
    if (character < " " || unsafeEvidencePathCharacters.has(character)) {
      return true;
    }
  }

  return false;
}

function hasAllowedRoot(value, field) {
  return readAllowedRoots(field).some((root) => value.startsWith(root));
}

function hasImageEvidenceExtension(value) {
  const extension = value
    .slice(value.lastIndexOf("."))
    .toLowerCase();

  return imageEvidenceExtensions.has(extension);
}

function readAllowedRoots(field) {
  return evidencePathRootsByField[field] ?? [];
}

function formatAllowedRoots(field) {
  return readAllowedRoots(field).join(", ");
}

function formatEvidenceField(input) {
  return `${input.component}.${input.viewport}.${input.field}`;
}
