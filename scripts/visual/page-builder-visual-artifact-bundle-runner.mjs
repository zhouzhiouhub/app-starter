import { copyFile, mkdir } from "node:fs/promises";
import {
  createPageBuilderVisualAcceptanceArtifact,
  createPageBuilderVisualAcceptanceChecklist,
  readPageBuilderVisualAcceptanceManifest,
  validatePageBuilderVisualAcceptanceManifest,
  writePageBuilderVisualAcceptanceArtifact,
  writePageBuilderVisualAcceptanceMarkdown,
} from "./page-builder-visual-acceptance.mjs";
import { checkPageBuilderVisualArtifact } from "./page-builder-visual-artifact-check.mjs";
import {
  createPageBuilderVisualCaptureArtifact,
  runPageBuilderVisualFixtureCapture,
  writePageBuilderVisualCaptureArtifact,
} from "./page-builder-visual-fixture-capture.mjs";
import {
  measurePageBuilderVisualAcceptanceManifest,
  readPageBuilderVisualMeasureManifest,
} from "./page-builder-visual-measure.mjs";

export async function runPageBuilderVisualArtifactBundle(config, input = {}) {
  await prepareArtifactManifest(config, input);

  const capture = await runCapture(config, input);
  const measure = runMeasure(config, input);
  const acceptance = await writeAcceptanceReport(config, input);
  const artifactCheck = runArtifactCheck(config, input);

  return {
    acceptance,
    artifactCheck,
    artifactDir: config.artifactDir,
    capture,
    measure,
    paths: config.paths,
    sourceManifestPath: config.sourceManifestPath,
  };
}

export function readPageBuilderVisualArtifactBundleExitCode(result) {
  if (
    result.artifactCheck.status === "complete" &&
    result.acceptance.status !== "invalid" &&
    result.measure.status !== "invalid"
  ) {
    return 0;
  }

  return 1;
}

async function prepareArtifactManifest(config, input) {
  await (input.mkdir ?? mkdir)(config.artifactDir, { recursive: true });
  await (input.copyFile ?? copyFile)(
    config.sourceManifestPath,
    config.paths.manifest,
  );
}

async function runCapture(config, input) {
  const capture = await (input.capture ?? runPageBuilderVisualFixtureCapture)(
    config.fixtureCapture,
    input.captureInput ?? input,
  );
  const artifact = createPageBuilderVisualCaptureArtifact(capture, {
    generatedAt: input.generatedAt,
  });

  await (input.writeCaptureArtifact ?? writePageBuilderVisualCaptureArtifact)(
    config.paths.captureReport,
    artifact,
  );

  return capture;
}

function runMeasure(config, input) {
  const manifest = (input.readMeasureManifest ??
    readPageBuilderVisualMeasureManifest)(config.paths.manifest);

  return (input.measure ?? measurePageBuilderVisualAcceptanceManifest)(
    manifest,
    config.measure,
    { evidenceRoot: input.evidenceRoot },
  );
}

async function writeAcceptanceReport(config, input) {
  const manifest = await (input.readAcceptanceManifest ??
    readPageBuilderVisualAcceptanceManifest)(config.paths.manifest);
  const report = validatePageBuilderVisualAcceptanceManifest(manifest, {
    evidenceRoot: input.evidenceRoot,
  });
  const checklist = createPageBuilderVisualAcceptanceChecklist(manifest, {
    evidenceRoot: input.evidenceRoot,
    manifestPath: config.paths.manifest,
  });
  const artifact = createPageBuilderVisualAcceptanceArtifact(report, {
    checklist,
  });

  await (input.writeAcceptanceArtifact ??
    writePageBuilderVisualAcceptanceArtifact)(
    config.paths.acceptanceReport,
    artifact,
  );
  await (input.writeAcceptanceMarkdown ??
    writePageBuilderVisualAcceptanceMarkdown)(
    config.paths.acceptanceMarkdown,
    report,
    checklist,
    { manifestPath: config.paths.manifest },
  );

  return report;
}

function runArtifactCheck(config, input) {
  return (input.checkArtifact ?? checkPageBuilderVisualArtifact)(
    { artifactDir: config.artifactDir },
    { cwd: input.cwd ?? process.cwd() },
  );
}
