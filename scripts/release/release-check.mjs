import {
  createSmokeReleaseCheck,
  readSmokeReleaseCheckArtifact,
} from "../smoke/smoke-release-check.mjs";
import {
  readPageBuilderVisualAcceptanceManifest,
  validatePageBuilderVisualAcceptanceManifest,
} from "../visual/page-builder-visual-acceptance.mjs";
import { readErrorMessage } from "../smoke/smoke-error-message.mjs";
import { readReleaseCheckCliConfig } from "./release-check-config.mjs";
import {
  createReleaseEvidenceCheckArtifact,
  writeReleaseEvidenceCheckArtifact,
} from "./release-check-artifact.mjs";
import { formatReleaseEvidenceCheck } from "./release-check-report.mjs";

const visualEvidenceAction =
  "Attach real design references and browser screenshots, run pnpm visual:measure -- --write --require-complete, then pnpm visual:acceptance -- --require-accepted.";

export {
  createReleaseEvidenceCheckArtifact,
  formatReleaseEvidenceCheck,
  readReleaseCheckCliConfig,
  writeReleaseEvidenceCheckArtifact,
};

export async function readReleaseEvidenceCheck(config, input = {}) {
  const smokeArtifact = await readOptionalSmokeArtifact(config, input);
  const visualManifest = await readOptionalVisualManifest(config, input);

  return createReleaseEvidenceCheck({
    smokeArtifact,
    smokeError: smokeArtifact.error,
    visualError: visualManifest.error,
    visualEvidenceRoot: input.visualEvidenceRoot,
    visualManifest: visualManifest.manifest,
    visualManifestPath: config.visualManifestPath,
  });
}

export function createReleaseEvidenceCheck(input) {
  const smoke = input.smokeError
    ? createMissingSmokeReleaseCheck(input.smokeError)
    : createSmokeReleaseCheck(input.smokeArtifact);
  const visual = input.visualError
    ? createInvalidVisualAcceptanceReport(input.visualError)
    : validatePageBuilderVisualAcceptanceManifest(input.visualManifest, {
        evidenceRoot: input.visualEvidenceRoot,
        requireAccepted: true,
      });
  const blockers = readReleaseEvidenceBlockers({ smoke, visual });

  return {
    blockers,
    releaseReady: blockers.length === 0,
    smoke,
    visual,
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

function createMissingSmokeReleaseCheck(error) {
  return {
    blockers: [
      {
        action: readErrorMessage(error),
        label: "Production smoke artifact missing",
      },
    ],
    groups: [],
    path: null,
    releaseReady: false,
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
    ...readVisualEvidenceBlockers(input.visual),
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

function readVisualEvidenceBlockers(visual) {
  if (visual.status === "accepted") {
    return [];
  }

  return [
    {
      action: visualEvidenceAction,
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
