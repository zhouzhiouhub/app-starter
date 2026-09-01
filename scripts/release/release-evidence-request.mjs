import { createProjectStatusArtifact } from "../project/project-status.mjs";
import {
  createProductionSmokeDispatchArtifact,
} from "../smoke/production-smoke-dispatch-cli.mjs";
import { readErrorMessage } from "../smoke/smoke-error-message.mjs";
import {
  createPageBuilderVisualReferenceImportArtifact,
  importPageBuilderVisualReferences,
} from "../visual/page-builder-visual-reference-import.mjs";
import { readReleaseEvidenceCheck } from "./release-check.mjs";
import {
  defaultReleaseEvidenceRequestOutputPath,
  readReleaseEvidenceRequestCliConfig,
} from "./release-evidence-request-config.mjs";
import { writeReleaseEvidenceRequestMarkdown } from "./release-evidence-request-markdown.mjs";

export { readReleaseEvidenceRequestCliConfig } from "./release-evidence-request-config.mjs";
export {
  createReleaseEvidenceRequestMarkdown,
  writeReleaseEvidenceRequestMarkdown,
} from "./release-evidence-request-markdown.mjs";

export async function runReleaseEvidenceRequestCli(args = [], input = {}) {
  const stdout = input.stdout ?? console.log;
  const stderr = input.stderr ?? console.error;

  if (args.includes("--help") || args.includes("-h")) {
    printHelp(stdout);
    return 0;
  }

  try {
    const config = readReleaseEvidenceRequestCliConfig(args);
    const generatedAt = input.generatedAt ?? new Date().toISOString();
    const request = await createReleaseEvidenceRequest(config, input, generatedAt);

    await writeReleaseEvidenceRequestMarkdown(config.outputPath, request);

    stdout(`Release evidence request written: ${config.outputPath}`);
    stdout(`Release ready: ${request.projectArtifact.releaseReady ? "yes" : "no"}`);
    stdout(
      `Visual references: ${request.visualReferenceArtifact.status} (${request.visualReferenceArtifact.missingCount}/${request.visualReferenceArtifact.requiredReferenceCount} missing)`,
    );
    const firstMissingReference =
      request.visualReferenceArtifact.missing[0]?.expectedPath;
    if (firstMissingReference) {
      stdout(`First missing visual reference: ${firstMissingReference}`);
    }
    stdout(
      `Production Smoke dispatch ready: ${request.smokeDispatchArtifact.readyToDispatch ? "yes" : "no"}`,
    );
    if (request.smokeDispatchArtifact.missingInputs.length > 0) {
      stdout(
        `Missing Production Smoke inputs: ${request.smokeDispatchArtifact.missingInputs.join(", ")}`,
      );
    }

    return 0;
  } catch (error) {
    stderr(`Release evidence request failed: ${readErrorMessage(error)}`);
    return 1;
  }
}

export async function createReleaseEvidenceRequest(config, input = {}, generatedAt) {
  const check = await readReleaseEvidenceCheck(config.releaseCheckConfig, input);
  const projectArtifact = createProjectStatusArtifact(check, {
    generatedAt,
    includeAllActions: true,
  });
  const visualReferenceReport = importPageBuilderVisualReferences(
    {
      manifestPath: config.visualManifestPath,
      requireComplete: false,
      sourceDir: config.visualSourceDir,
      write: false,
    },
    {
      cwd: input.visualReferenceRoot,
      manifest: input.visualReferenceManifest ?? input.visualManifest,
    },
  );

  return {
    generatedAt,
    projectArtifact,
    smokeDispatchArtifact: createProductionSmokeDispatchArtifact(
      config.smokeDispatchConfig,
    ),
    visualReferenceArtifact: createPageBuilderVisualReferenceImportArtifact(
      visualReferenceReport,
      { generatedAt },
    ),
  };
}

function printHelp(writeLine) {
  writeLine(`Usage:
  pnpm release:evidence-request
  pnpm release:evidence-request -- --output artifacts/release/release-evidence-request.md
  pnpm release:evidence-request -- --visual-artifact page-builder-visual-fixture-123 --visual-artifact-run-id 456
  pnpm release:evidence-request -- --smoke-report artifacts/production-smoke/smoke-report.json --visual-artifact-dir reports/visual/page-builder-fixture

Options:
  --output <path>              Write the combined release evidence request Markdown.
  --smoke-report <path>        Read a specific production smoke report for the status snapshot.
  --visual-artifact-dir <dir>  Include a downloaded Page Builder Visual artifact in the status snapshot.
  --visual-manifest <path>     Read a specific Page Builder visual manifest.
  --source-dir <dir>           Directory containing Page Builder reference PNGs.
  --visual-source-dir <dir>    Alias for --source-dir.

Smoke evidence inputs:
  Accepts the same production smoke evidence input overrides as pnpm smoke:request,
  including --visual-artifact, --visual-artifact-run-id,
  --local-verification-run-url, --local-verification-artifact, --release-tag,
  --rollback-target, and --storefront-url.

Evidence:
  This command writes one release-facing request that embeds the Page Builder
  design reference request and Production Smoke request. The terminal summary
  reports release readiness, visual reference status, the first missing visual
  reference, Production Smoke dispatch readiness, and any missing Smoke input
  names to unblock first. It does not run smoke, import visual references,
  accept evidence, create release notes, or mark the project ready.

Default output:
  ${defaultReleaseEvidenceRequestOutputPath}`);
}
