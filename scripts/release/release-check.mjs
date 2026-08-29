import {
  createSmokeReleaseCheck,
  readSmokeReleaseCheckArtifact,
} from "../smoke/smoke-release-check.mjs";
import { createEmptySmokeSourceMetadata } from "../smoke/smoke-source-metadata.mjs";
import {
  createPageBuilderVisualAcceptanceChecklist,
  readPageBuilderVisualAcceptanceManifest,
  validatePageBuilderVisualAcceptanceManifest,
} from "../visual/page-builder-visual-acceptance.mjs";
import { checkPageBuilderVisualArtifact } from "../visual/page-builder-visual-artifact-check.mjs";
import { readErrorMessage } from "../smoke/smoke-error-message.mjs";
import { readReleaseCheckCliConfig } from "./release-check-config.mjs";
import {
  createReleaseEvidenceCheckArtifact,
  writeReleaseEvidenceCheckArtifact,
} from "./release-check-artifact.mjs";
import {
  createVisualEvidenceAction,
  visualArtifactAction,
} from "./release-check-visual-actions.mjs";
import { createMissingSmokeArtifactAction } from "./release-check-smoke-actions.mjs";
export {
  createReleaseEvidenceReadinessChecklist,
  formatReleaseEvidenceReadinessChecklist,
} from "./release-check-checklist.mjs";
import { formatReleaseEvidenceCheck } from "./release-check-report.mjs";

export {
  createReleaseEvidenceCheckArtifact,
  formatReleaseEvidenceCheck,
  readReleaseCheckCliConfig,
  writeReleaseEvidenceCheckArtifact,
};
export {
  createReleaseEvidenceCheckMarkdown,
  writeReleaseEvidenceCheckMarkdown,
} from "./release-check-markdown.mjs";

export async function readReleaseEvidenceCheck(config, input = {}) {
  const smokeArtifact = await readOptionalSmokeArtifact(config, input);
  const visualArtifact = readOptionalVisualArtifactCheck(config, input);
  const visualManifest = await readOptionalVisualManifest(config, input);

  return createReleaseEvidenceCheck({
    smokeArtifact,
    smokeError: smokeArtifact.error,
    smokeReportPath: config.smokeReportPath,
    visualArtifact,
    visualArtifactDir: config.visualArtifactDir,
    visualError: visualManifest.error,
    visualEvidenceRoot: input.visualEvidenceRoot,
    visualManifest: visualManifest.manifest,
    visualManifestPath: config.visualManifestPath,
  });
}

export function createReleaseEvidenceCheck(input) {
  const smoke = input.smokeError
    ? createMissingSmokeReleaseCheck(input.smokeError, input.smokeReportPath)
    : createSmokeReleaseCheck(input.smokeArtifact);
  const visual = input.visualError
    ? createInvalidVisualAcceptanceReport(input.visualError)
    : validatePageBuilderVisualAcceptanceManifest(input.visualManifest, {
        evidenceRoot: input.visualEvidenceRoot,
      });
  const visualChecklist = createPageBuilderVisualAcceptanceChecklist(
    input.visualManifest,
    {
      evidenceRoot: input.visualEvidenceRoot,
      manifestPath: input.visualManifestPath,
    },
  );
  const blockers = readReleaseEvidenceBlockers({
    smoke,
    visual,
    visualArtifact: input.visualArtifact,
  });

  return {
    blockers,
    releaseReady: blockers.length === 0,
    smoke,
    visual,
    visualArtifact: input.visualArtifact ?? null,
    visualArtifactDir: input.visualArtifactDir ?? null,
    visualChecklist,
    visualManifestPath: input.visualManifestPath,
  };
}

async function readOptionalSmokeArtifact(config, input) {
  if (Object.hasOwn(input, "smokeArtifact")) {
    return input.smokeArtifact;
  }

  try {
    return await readSmokeReleaseCheckArtifact({
      reportPath: config.smokeReportPath,
      roots: input.smokeRoots,
    });
  } catch (error) {
    return { error };
  }
}

async function readOptionalVisualManifest(config, input) {
  if (Object.hasOwn(input, "visualManifest")) {
    return { manifest: input.visualManifest };
  }

  try {
    return {
      manifest: await readPageBuilderVisualAcceptanceManifest(
        config.visualManifestPath,
      ),
    };
  } catch (error) {
    return { error };
  }
}

function readOptionalVisualArtifactCheck(config, input) {
  if (Object.hasOwn(input, "visualArtifact")) {
    return input.visualArtifact;
  }

  if (!config.visualArtifactDir) {
    return null;
  }

  try {
    return checkPageBuilderVisualArtifact(
      { artifactDir: config.visualArtifactDir },
      { cwd: input.visualArtifactRoot ?? input.visualEvidenceRoot },
    );
  } catch (error) {
    return createInvalidVisualArtifactReport(error, config.visualArtifactDir);
  }
}

function createMissingSmokeReleaseCheck(error, smokeReportPath) {
  return {
    blockers: [
      {
        action: createMissingSmokeArtifactAction(error, smokeReportPath),
        label: "Production smoke artifact missing",
      },
    ],
    groups: [],
    path: smokeReportPath ?? null,
    releaseReady: false,
    source: createEmptySmokeSourceMetadata(),
    summary: {
      failedCheckCount: 1,
      productionReady: false,
      status: "missing",
    },
  };
}

function createInvalidVisualAcceptanceReport(error) {
  return {
    acceptedComponentCount: 0,
    acceptedViewportCount: 0,
    componentCount: 0,
    errorCount: 1,
    issues: [
      {
        code: "visual_manifest_unreadable",
        message: `Unable to read Page Builder visual manifest: ${readErrorMessage(
          error,
        )}`,
        severity: "error",
      },
    ],
    records: [],
    status: "invalid",
    viewportCount: 0,
    warningCount: 0,
  };
}

function readReleaseEvidenceBlockers(input) {
  return [
    ...readSmokeEvidenceBlockers(input.smoke),
    ...readVisualArtifactBlockers(input.visualArtifact),
    ...readVisualEvidenceBlockers(input.visual, input.visualArtifact),
  ];
}

function readSmokeEvidenceBlockers(smoke) {
  if (smoke.releaseReady) {
    return [];
  }

  return smoke.blockers.map((blocker) => ({
    action: blocker.action,
    area: "Production Smoke",
    label: blocker.label,
  }));
}

function readVisualEvidenceBlockers(visual, artifact) {
  if (visual.status === "accepted") {
    return [];
  }

  return [
    {
      action: createVisualEvidenceAction(artifact),
      area: "Page Builder Visual",
      label:
        visual.status === "invalid"
          ? "Visual acceptance invalid"
          : "Visual acceptance pending",
    },
    ...visual.issues.map((issue) => ({
      action: issue.message,
      area: "Page Builder Visual",
      label: issue.code,
    })),
  ];
}

function readVisualArtifactBlockers(artifact) {
  if (!artifact || artifact.status === "complete") {
    return [];
  }

  return [
    {
      action: visualArtifactAction,
      area: "Page Builder Visual",
      label: "Visual artifact invalid",
    },
    ...artifact.issues.map((issue) => ({
      action: issue.message,
      area: "Page Builder Visual",
      label: issue.code,
    })),
  ];
}

function createInvalidVisualArtifactReport(error, artifactDir) {
  return {
    artifactDir,
    expectedScreenshotCount: 0,
    issues: [
      {
        code: "visual_artifact_check_failed",
        message: `Unable to check Page Builder visual artifact: ${readErrorMessage(
          error,
        )}`,
        severity: "error",
      },
    ],
    presentRequiredFileCount: 0,
    presentScreenshotCount: 0,
    requiredFileCount: 0,
    status: "invalid",
  };
}
