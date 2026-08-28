import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { formatSmokeText } from "../smoke/smoke-text.mjs";

export const releaseEvidenceCheckSchemaVersion = "release-evidence-check.v1";

const maxArtifactBlockerCount = 50;
const maxArtifactTextLength = 420;
const maxVisualIssueCount = 50;

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
  const visualIssues = check.visual.issues.slice(0, maxVisualIssueCount);

  return {
    acceptedComponentCount: check.visual.acceptedComponentCount,
    acceptedViewportCount: check.visual.acceptedViewportCount,
    componentCount: check.visual.componentCount,
    errorCount: check.visual.errorCount,
    issueCount: check.visual.issues.length,
    issues: visualIssues.map(createVisualIssueArtifact),
    manifestPath: readTextOrNull(check.visualManifestPath),
    pendingComponents: readPendingVisualComponents(check.visual),
    pendingViewports: readPendingVisualViewports(check.visual),
    status: check.visual.status,
    viewportCount: check.visual.viewportCount,
    warningCount: check.visual.warningCount,
  };
}

function createVisualIssueArtifact(issue) {
  return {
    code: readTextOrNull(issue.code) ?? "unknown",
    component: readTextOrNull(issue.component),
    message: readTextOrNull(issue.message) ?? "unknown",
    severity: readTextOrNull(issue.severity) ?? "unknown",
    viewport: readTextOrNull(issue.viewport),
  };
}

function readPendingVisualComponents(visual) {
  if (!Array.isArray(visual.records)) {
    return [];
  }

  return visual.records
    .filter((record) => record.accepted !== true)
    .map((record) => readTextOrNull(record.component))
    .filter(Boolean);
}

function readPendingVisualViewports(visual) {
  if (!Array.isArray(visual.records)) {
    return [];
  }

  return visual.records.flatMap((record) =>
    readRecordPendingViewports(record, readTextOrNull(record.component)),
  );
}

function readRecordPendingViewports(record, component) {
  if (!component || !Array.isArray(record.viewports)) {
    return [];
  }

  return record.viewports
    .filter((viewport) => viewport.accepted !== true)
    .map((viewport) => readPendingViewportLabel(component, viewport.viewport))
    .filter(Boolean);
}

function readPendingViewportLabel(component, viewport) {
  const normalizedViewport = readTextOrNull(viewport);
  return normalizedViewport ? `${component}.${normalizedViewport}` : null;
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
