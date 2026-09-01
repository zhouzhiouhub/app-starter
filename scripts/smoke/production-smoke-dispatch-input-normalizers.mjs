import {
  normalizeArtifactName,
  normalizeLocalVerificationArtifactName,
  normalizePlainValue,
  normalizeReleaseTag,
  normalizeStorefrontUrl,
  normalizeWorkflowRunUrl,
} from "../release/release-notes-validation.mjs";

const safeVisualArtifactNamePattern =
  /^page-builder-visual-fixture-[0-9]{1,20}$/u;
const safeGithubRunIdPattern = /^[0-9]{1,20}$/u;
const safeRollbackTargetPattern = /^[A-Za-z0-9][A-Za-z0-9._/@:-]{0,159}$/u;

export const productionSmokeDispatchOptionInputNames = new Map([
  ["--visual-artifact-name", "visual_artifact_name"],
  ["--visual-artifact", "visual_artifact_name"],
  ["--visual-artifact-run-id", "visual_artifact_run_id"],
  ["--local-verification-run-url", "local_verification_run_url"],
  ["--local-verification-artifact-name", "local_verification_artifact_name"],
  ["--local-verification-artifact", "local_verification_artifact_name"],
  ["--release-tag", "release_tag"],
  ["--rollback-target", "rollback_target"],
  ["--storefront-url", "storefront_url"],
]);

const inputNormalizers = {
  local_verification_artifact_name: normalizeLocalVerificationArtifactName,
  local_verification_run_url: normalizeWorkflowRunUrl,
  release_tag: normalizeReleaseTag,
  rollback_target: normalizeRollbackTarget,
  storefront_url: normalizeStorefrontUrl,
  visual_artifact_name: normalizeVisualArtifactName,
  visual_artifact_run_id: normalizeGithubRunId,
};

export function normalizeProductionSmokeDispatchInputValue(name, value) {
  const normalizer = inputNormalizers[name];

  if (!normalizer) {
    throw new Error(`Unknown Production Smoke dispatch input: ${name}`);
  }

  return normalizer(value);
}

export function isProductionSmokeDispatchInputName(value) {
  return Object.hasOwn(inputNormalizers, value);
}

function normalizeGithubRunId(value) {
  const normalized = normalizePlainValue("GitHub workflow run id", value);

  if (!safeGithubRunIdPattern.test(normalized)) {
    throw new Error("GitHub workflow run id must contain only digits.");
  }

  return normalized;
}

function normalizeRollbackTarget(value) {
  const normalized = normalizePlainValue("rollback target", value);

  if (!safeRollbackTargetPattern.test(normalized)) {
    throw new Error(
      "Rollback target must use safe characters: letters, numbers, dot, underscore, dash, slash, at, or colon.",
    );
  }

  return normalized;
}

function normalizeVisualArtifactName(value) {
  const normalized = normalizeArtifactName("visual artifact", value);

  if (!safeVisualArtifactNamePattern.test(normalized)) {
    throw new Error(
      "Visual artifact must use the page-builder-visual-fixture-<run_number> naming pattern.",
    );
  }

  return normalized;
}
