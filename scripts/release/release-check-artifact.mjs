import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { formatSmokeText } from "../smoke/smoke-text.mjs";

export const releaseEvidenceCheckSchemaVersion = "release-evidence-check.v1";

const maxArtifactBlockerCount = 50;
const maxArtifactTextLength = 420;

export function createReleaseEvidenceCheckArtifact(check, input = {}) {
  const blockers = check.blockers.slice(0, maxArtifactBlockerCount);

  return {
    blockerCount: check.blockers.length,
    blockers: blockers.map(createBlockerArtifact),
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    releaseReady: check.releaseReady,
    schemaVersion: releaseEvidenceCheckSchemaVersion,
    smoke: createSmokeArtifact(check.smoke),
    status: check.releaseReady ? "ready" : "blocked",
    visual: createVisualArtifact(check),
  };
}

export async function writeReleaseEvidenceCheckArtifact(outputPath, artifact) {
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
}

function createSmokeArtifact(smoke) {
  return {
    path: readTextOrNull(smoke.path),
    releaseReady: smoke.releaseReady,
    status: smoke.releaseReady ? "ready" : "blocked",
    summary: {
      checkCount: smoke.summary?.checkCount ?? 0,
      failedCheckCount: smoke.summary?.failedCheckCount ?? 0,
      productionReady: smoke.summary?.productionReady === true,
      status: readTextOrNull(smoke.summary?.status) ?? "unknown",
    },
    traceability: smoke.groups.map((group) => ({
      action: readTextOrNull(group.action),
      label: readTextOrNull(group.label) ?? "unknown",
      status: readTextOrNull(group.status) ?? "unknown",
    })),
  };
}

function createVisualArtifact(check) {
  return {
    acceptedComponentCount: check.visual.acceptedComponentCount,
    acceptedViewportCount: check.visual.acceptedViewportCount,
    componentCount: check.visual.componentCount,
    errorCount: check.visual.errorCount,
    manifestPath: readTextOrNull(check.visualManifestPath),
    status: check.visual.status,
    viewportCount: check.visual.viewportCount,
    warningCount: check.visual.warningCount,
  };
}

function createBlockerArtifact(blocker) {
  return {
    action: readTextOrNull(blocker.action) ?? "unknown",
    area: readTextOrNull(blocker.area) ?? "unknown",
    label: readTextOrNull(blocker.label) ?? "unknown",
  };
}

function readTextOrNull(value) {
  if (typeof value !== "string" || value.length === 0) {
    return null;
  }

  return formatSmokeText(value, { maxLength: maxArtifactTextLength });
}
