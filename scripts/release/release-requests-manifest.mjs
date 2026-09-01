import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import {
  normalizeReleaseRequestsManifestOutputPath,
} from "./release-requests-manifest-path.mjs";

export const releaseRequestsManifestSchemaVersion =
  "release-requests-manifest.v1";
export {
  defaultReleaseRequestsManifestOutputPath,
  normalizeReleaseRequestsManifestOutputPath,
} from "./release-requests-manifest-path.mjs";

export function createReleaseRequestsManifest(input = {}) {
  const request = input.releaseEvidenceRequest ?? {};
  const outputPaths = input.outputPaths ?? {};
  const project = request.projectArtifact ?? {};
  const visual = request.visualReferenceArtifact ?? {};
  const smoke = request.smokeDispatchArtifact ?? {};
  const missingInputs = Array.isArray(smoke.missingInputs)
    ? smoke.missingInputs
    : [];
  const missingReferences = Array.isArray(visual.missing) ? visual.missing : [];

  return {
    command: input.command ?? "",
    generatedAt: request.generatedAt ?? input.generatedAt ?? "",
    outputPaths,
    pageBuilderVisual: {
      firstMissingReference: missingReferences[0]?.expectedPath ?? null,
      missingCount: readNumber(visual.missingCount),
      referenceExportManifestPath: outputPaths.visualReferenceManifest ?? null,
      referenceExportTablePath: outputPaths.visualReferenceTable ?? null,
      referenceHandoffOutputDir: outputPaths.visualReferenceHandoff ?? null,
      referenceRequestPath: outputPaths.visualReference ?? null,
      requiredReferenceCount: readNumber(visual.requiredReferenceCount),
      status: visual.status ?? "unknown",
    },
    productionSmoke: {
      inputCount: Array.isArray(smoke.inputs) ? smoke.inputs.length : 0,
      inputsManifestPath: outputPaths.productionSmokeInputsManifest ?? null,
      inputsOutputPath: outputPaths.productionSmokeInputs ?? null,
      inputsTablePath: outputPaths.productionSmokeInputsTable ?? null,
      missingInputCount: missingInputs.length,
      missingInputs,
      readyToDispatch: smoke.readyToDispatch === true,
      requestPath: outputPaths.productionSmoke ?? null,
    },
    releaseEvidence: {
      blockerCount: readNumber(project.releaseGate?.blockerCount),
      decision: project.completionSummary?.releaseDecision ?? "unknown",
      ready: project.releaseReady === true,
      requestPath: outputPaths.releaseEvidence ?? null,
      status: project.status ?? "unknown",
    },
    schemaVersion: releaseRequestsManifestSchemaVersion,
    status: project.releaseReady === true ? "ready" : "needs-evidence",
  };
}

export async function writeReleaseRequestsManifest(outputPath, input) {
  const normalizedOutputPath =
    normalizeReleaseRequestsManifestOutputPath(outputPath);

  await mkdir(dirname(normalizedOutputPath), { recursive: true });
  await writeFile(
    normalizedOutputPath,
    `${JSON.stringify(createReleaseRequestsManifest(input), null, 2)}\n`,
    "utf8",
  );

  return normalizedOutputPath;
}

function readNumber(value) {
  return Number.isFinite(value) ? value : 0;
}
