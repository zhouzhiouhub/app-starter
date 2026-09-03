import { formatSmokeText } from "../smoke/smoke-text.mjs";
import { createMissingProductionSmokeEvidenceArtifact } from "../smoke/smoke-missing-evidence-markdown.mjs";
import { createProjectCompletionChecklist } from "./project-status-completion-checklist.mjs";
import {
  createLocalVerificationSummary,
} from "./project-status-local-verification.mjs";
import {
  createProjectNextActions,
  readPendingVisualTasks,
} from "./project-status-next-actions.mjs";
import {
  createProjectVisualMeasurementSummary,
} from "./project-status-visual-measurement-summary.mjs";

export const projectStatusSchemaVersion = "project-status.v1";

const maxProjectActionCount = 8;
const maxProjectTextLength = 420;
const completedMilestones = [
  "Monorepo apps, shared packages, and extension/custom directories are scaffolded.",
  "MVP page management, Page Builder, preview, publish, rollback, SEO, media, audit logs, and starter pages are implemented.",
  "Commerce and multi-locale expansion remain explicit disabled placeholders for MVP.",
  "Production smoke, visual acceptance, release evidence, and release notes tooling are wired.",
  "Production deployment, environment variable matrix, and rollback runbook are documented for the MVP release path.",
];

export function createProjectStatusArtifact(check, input = {}) {
  const nextActions = createProjectNextActions(check);
  const serializedActionCount = input.includeAllActions
    ? nextActions.length
    : maxProjectActionCount;
  const serializedNextActions = nextActions.slice(0, serializedActionCount);

  return {
    completionSummary: createCompletionSummary(check),
    completionChecklist: createProjectCompletionChecklist(check, nextActions),
    completedMilestones,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    localVerification: createLocalVerificationSummary({
      handoff: input.localVerificationHandoff,
    }),
    nextActionCount: nextActions.length,
    nextActionLimit: serializedActionCount,
    nextActions: serializedNextActions,
    phase: "MVP release verification",
    releaseGate: createReleaseGateSummary(check),
    releaseReady: check.releaseReady,
    schemaVersion: projectStatusSchemaVersion,
    status: check.releaseReady ? "release-ready" : "needs-evidence",
    truncatedNextActionCount: nextActions.length - serializedNextActions.length,
  };
}

function createCompletionSummary(check) {
  const releaseReady = check.releaseReady === true;

  return {
    localMvpScope: "implemented",
    releaseDecision: releaseReady ? "ready-to-release" : "not-ready",
    releaseEvidenceStatus: releaseReady ? "ready" : "needs-evidence",
    summary: releaseReady
      ? "MVP implementation and retained release evidence are ready for release notes."
      : "MVP implementation is in release verification; final completion still requires retained production smoke and Page Builder visual acceptance evidence.",
  };
}

function createReleaseGateSummary(check) {
  const visualMeasurementFailures = createProjectVisualMeasurementSummary(
    check.visualChecklist,
  );
  const smokeGate = {
    blockerCount: countBlockers(check, "Production Smoke"),
    markdown: createSmokeMarkdownSummary(check.smoke.markdown),
    path: readText(check.smoke.path),
    status: check.smoke.releaseReady ? "ready" : "blocked",
    summaryStatus: readText(check.smoke.summary?.status) ?? "unknown",
  };
  const missingSmokeEvidence = createMissingProductionSmokeEvidenceArtifact(
    smokeGate,
  );

  if (missingSmokeEvidence) {
    smokeGate.missingEvidence = missingSmokeEvidence;
  }

  return {
    blockerCount: check.blockers.length,
    smoke: smokeGate,
    visual: {
      acceptedComponentCount: check.visual.acceptedComponentCount,
      acceptedViewportCount: check.visual.acceptedViewportCount,
      artifactCheck: createVisualArtifactCheckSummary(check.visualArtifact),
      artifactStatus: readText(check.visualArtifact?.status),
      componentCount: check.visual.componentCount,
      failedMeasurementCount: visualMeasurementFailures.failedMeasurementCount,
      failedMeasurementViewportCount:
        visualMeasurementFailures.failedMeasurementViewportCount,
      firstFailedMeasurement: readText(
        visualMeasurementFailures.firstFailedMeasurement,
      ),
      pendingComponentCount: readPendingCount(check.visual.records),
      pendingTaskCount: readVisualPendingTaskCount(check.visualChecklist),
      pendingViewportCount: readVisualPendingViewportCount(
        check.visualChecklist,
      ),
      status: check.visual.status,
      viewportCount: check.visual.viewportCount,
    },
  };
}

function createSmokeMarkdownSummary(markdown) {
  if (!markdown) {
    return null;
  }

  return {
    issueCount: readCount(markdown.issueCount) ?? 0,
    path: readText(markdown.path),
    status: readText(markdown.status) ?? "unknown",
  };
}

function createVisualArtifactCheckSummary(check) {
  if (!check) {
    return null;
  }

  return {
    artifactDir: readText(check.artifactDir),
    expectedScreenshotCount: readCount(check.expectedScreenshotCount),
    issueCount: readVisualArtifactIssueCount(check),
    ...createOptionalCount(
      "presentDesignReferenceCount",
      check.presentDesignReferenceCount,
    ),
    presentRequiredFileCount: readCount(check.presentRequiredFileCount),
    presentScreenshotCount: readCount(check.presentScreenshotCount),
    ...createOptionalReferenceImportSummary(check.referenceImport),
    ...createOptionalCount(
      "referencedDesignReferenceCount",
      check.referencedDesignReferenceCount,
    ),
    requiredFileCount: readCount(check.requiredFileCount),
    status: readText(check.status) ?? "unknown",
  };
}

function createOptionalReferenceImportSummary(referenceImport) {
  if (!referenceImport) {
    return {};
  }

  return {
    referenceImport: {
      complete: referenceImport.complete === true,
      ...createOptionalText(
        "firstMissingReferenceReason",
        referenceImport.firstMissingReferenceReason,
      ),
      ...createOptionalText(
        "firstMissingReferencePreview",
        referenceImport.firstMissingReferencePreview,
      ),
      manifestPath: readText(referenceImport.manifestPath),
      missingCount: readCount(referenceImport.missingCount) ?? 0,
      missingReferences: readStringList(referenceImport.missingReferences),
      ...createOptionalRequiredReferenceSummary(referenceImport),
      sourceDir: readText(referenceImport.sourceDir),
      sourceDirStatus: readText(referenceImport.sourceDirStatus) ?? "unknown",
      status: readText(referenceImport.status) ?? "unknown",
      updated: referenceImport.updated === true,
      updateCount: readCount(referenceImport.updateCount) ?? 0,
    },
  };
}

function createOptionalRequiredReferenceSummary(referenceImport) {
  if (
    referenceImport.requiredReferenceCount === undefined &&
    referenceImport.requiredReferenceEntryCount === undefined &&
    referenceImport.requiredReferenceStatusCounts === undefined
  ) {
    return {};
  }

  return {
    requiredReferenceCount: readCount(referenceImport.requiredReferenceCount) ?? 0,
    requiredReferenceEntryCount:
      readCount(referenceImport.requiredReferenceEntryCount) ?? 0,
    requiredReferenceStatusCounts: readRequiredReferenceStatusCounts(
      referenceImport.requiredReferenceStatusCounts,
    ),
  };
}

function readRequiredReferenceStatusCounts(value) {
  const counts = isObject(value) ? value : {};

  return {
    invalid: readCount(counts.invalid) ?? 0,
    missing: readCount(counts.missing) ?? 0,
    ready: readCount(counts.ready) ?? 0,
    updated: readCount(counts.updated) ?? 0,
    wouldUpdate: readCount(counts.wouldUpdate) ?? 0,
  };
}

function readVisualArtifactIssueCount(check) {
  return (
    readCount(check.issueCount) ??
    (Array.isArray(check.issues) ? check.issues.length : 0)
  );
}

function readStringList(value) {
  return Array.isArray(value)
    ? value.filter((item) => typeof item === "string" && item.length > 0)
    : [];
}

function createOptionalCount(field, value) {
  return Number.isFinite(value) ? { [field]: value } : {};
}

function createOptionalText(field, value) {
  const text = readText(value);

  return text ? { [field]: text } : {};
}

function readPendingCount(records) {
  return Array.isArray(records)
    ? records.filter((record) => record.accepted !== true).length
    : 0;
}

function readVisualPendingTaskCount(checklist) {
  return readPendingVisualTasks(checklist).length;
}

function readVisualPendingViewportCount(checklist) {
  return typeof checklist?.pendingViewportCount === "number"
    ? checklist.pendingViewportCount
    : readVisualPendingTaskCount(checklist);
}

function countBlockers(check, area) {
  return check.blockers.filter((blocker) => blocker.area === area).length;
}

function readText(value) {
  if (typeof value !== "string" || value.length === 0) {
    return null;
  }

  return formatSmokeText(value, { maxLength: maxProjectTextLength });
}

function readCount(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
