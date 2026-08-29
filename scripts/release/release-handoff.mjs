import {
  createProjectStatusArtifact,
  writeProjectStatusArtifact,
  writeProjectStatusMarkdown,
} from "../project/project-status.mjs";
import { readErrorMessage } from "../smoke/smoke-error-message.mjs";
import { formatSmokeText } from "../smoke/smoke-text.mjs";
import { validateProductionSmokeReleaseInputs } from "./production-smoke-release-inputs.mjs";
import { writeProductionSmokePreflightReport } from "./production-smoke-preflight-report.mjs";
import {
  createReleaseEvidenceCheckArtifact,
  readReleaseCheckCliConfig,
  readReleaseEvidenceCheck,
  writeReleaseEvidenceCheckArtifact,
  writeReleaseEvidenceCheckMarkdown,
} from "./release-check.mjs";
import {
  createReleaseCheckArgs,
  readReleaseHandoffCliConfig,
} from "./release-handoff-config.mjs";

export { readReleaseHandoffCliConfig } from "./release-handoff-config.mjs";

export async function runReleaseHandoffCli(args = [], input = {}) {
  const stdout = input.stdout ?? console.log;
  const stderr = input.stderr ?? console.error;

  if (args.includes("--help") || args.includes("-h")) {
    (input.printHelp ?? printReleaseHandoffHelp)(stdout);
    return 0;
  }

  try {
    const config = readReleaseHandoffCliConfig(args);
    const generatedAt = input.generatedAt ?? new Date().toISOString();
    const preflightReport = await writeReleaseHandoffPreflight(
      config,
      input,
      generatedAt,
    );
    const releaseCheckConfig = readReleaseCheckCliConfig(
      createReleaseCheckArgs(config),
    );
    const check = await readReleaseEvidenceCheck(releaseCheckConfig, input);
    const releaseArtifact = createReleaseEvidenceCheckArtifact(check, {
      generatedAt,
    });
    const projectArtifact = createProjectStatusArtifact(check, {
      generatedAt,
      includeAllActions: true,
    });

    await writeReleaseEvidenceCheckArtifact(
      config.releaseCheckOutputPath,
      releaseArtifact,
    );
    await writeReleaseEvidenceCheckMarkdown(
      config.releaseCheckMarkdownPath,
      releaseArtifact,
    );
    await writeProjectStatusArtifact(
      config.projectStatusOutputPath,
      projectArtifact,
    );
    await writeProjectStatusMarkdown(
      config.projectStatusMarkdownPath,
      projectArtifact,
    );

    for (const line of formatReleaseHandoffSummary({
      config,
      preflightReport,
      projectArtifact,
      releaseArtifact,
    })) {
      stdout(line);
    }

    const handoffReady =
      releaseArtifact.releaseReady && preflightReport.status === "passed";

    return config.requireReady && !handoffReady ? 1 : 0;
  } catch (error) {
    stderr(`Release handoff failed: ${readErrorMessage(error)}`);
    return 1;
  }
}

export function formatReleaseHandoffSummary(input) {
  const nextAction = input.projectArtifact.nextActions[0];
  const handoffReady =
    input.releaseArtifact.releaseReady &&
    input.preflightReport.status === "passed";

  return [
    "Release handoff written:",
    `  Status: ${input.projectArtifact.status}`,
    `  Release ready: ${handoffReady ? "yes" : "no"}`,
    `  Blockers: ${input.releaseArtifact.blockerCount}`,
    `  Preflight status: ${input.preflightReport.status}`,
    `  Preflight JSON: ${input.config.preflightOutputPath}`,
    `  Preflight Markdown: ${input.config.preflightMarkdownPath}`,
    `  Release evidence JSON: ${input.config.releaseCheckOutputPath}`,
    `  Release evidence Markdown: ${input.config.releaseCheckMarkdownPath}`,
    `  Project status JSON: ${input.config.projectStatusOutputPath}`,
    `  Project status Markdown: ${input.config.projectStatusMarkdownPath}`,
    `  Next action: ${formatNextAction(nextAction)}`,
  ];
}

export function printReleaseHandoffHelp(writeLine) {
  writeLine(`Usage:
  pnpm release:handoff
  pnpm release:handoff -- --smoke-report artifacts/production-smoke/smoke-report.json
  pnpm release:handoff -- --visual-artifact-dir reports/visual/page-builder-fixture
  pnpm release:handoff -- --require-ready

Options:
  --latest                     Use the newest archived smoke report.
  --require-ready              Exit 1 after writing reports unless evidence is ready.
  --smoke-report <path>        Read a specific production smoke report.
  --visual-artifact-dir <dir>  Include a downloaded Page Builder Visual artifact.
  --visual-manifest <path>     Read a specific Page Builder visual manifest.
  --release-check-output <path>
                               Write release-evidence-check.v1 JSON.
  --release-check-markdown <path>
                               Write release evidence Markdown.
  --preflight-output <path>    Write production-smoke-preflight.v1 JSON.
  --preflight-markdown <path>  Write production smoke preflight Markdown.
  --project-status-output <path>
                               Write project-status.v1 JSON.
  --project-status-markdown <path>
                               Write project status Markdown handoff.
  -h, --help                   Show this help.

Release handoff:
  Writes preflight.json, preflight.md, release-check.json, release-check.md,
  project-status.json, and project-status.md from the same handoff run. Blocked
  evidence still writes the handoff; use --require-ready when the command should
  gate release.`);
}

async function writeReleaseHandoffPreflight(config, input, generatedAt) {
  const env = input.env ?? process.env;
  const outputs = {
    jsonOutput: config.preflightOutputPath,
    markdownOutput: config.preflightMarkdownPath,
  };

  try {
    return await writeProductionSmokePreflightReport(outputs, {
      env,
      generatedAt,
      result: validateProductionSmokeReleaseInputs(env),
    });
  } catch (error) {
    return writeProductionSmokePreflightReport(outputs, {
      env,
      error,
      generatedAt,
    });
  }
}

function formatNextAction(action) {
  if (!action) {
    return "None";
  }

  return formatSmokeText(`${action.area}: ${action.label} - ${action.action}`, {
    maxLength: 420,
  });
}
