import {
  createProjectStatusArtifact,
  writeProjectStatusArtifact,
  writeProjectStatusMarkdown,
} from "../project/project-status.mjs";
import { readErrorMessage } from "../smoke/smoke-error-message.mjs";
import { formatSmokeText } from "../smoke/smoke-text.mjs";
import {
  createReleaseEvidenceCheckArtifact,
  readReleaseCheckCliConfig,
  readReleaseEvidenceCheck,
  writeReleaseEvidenceCheckArtifact,
  writeReleaseEvidenceCheckMarkdown,
} from "./release-check.mjs";
import {
  normalizeProjectStatusMarkdownPath,
  normalizeProjectStatusPath,
  normalizeReleaseCheckMarkdownPath,
  normalizeReleaseEvidencePath,
} from "./release-notes-validation.mjs";

const defaultReleaseCheckOutputPath = "artifacts/release/release-check.json";
const defaultReleaseCheckMarkdownPath = "artifacts/release/release-check.md";
const defaultProjectStatusOutputPath = "artifacts/release/project-status.json";
const defaultProjectStatusMarkdownPath = "artifacts/release/project-status.md";

export async function runReleaseHandoffCli(args = [], input = {}) {
  const stdout = input.stdout ?? console.log;
  const stderr = input.stderr ?? console.error;

  if (args.includes("--help") || args.includes("-h")) {
    (input.printHelp ?? printReleaseHandoffHelp)(stdout);
    return 0;
  }

  try {
    const config = readReleaseHandoffCliConfig(args);
    const releaseCheckConfig = readReleaseCheckCliConfig(
      createReleaseCheckArgs(config),
    );
    const check = await readReleaseEvidenceCheck(releaseCheckConfig, input);
    const generatedAt = input.generatedAt ?? new Date().toISOString();
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
      projectArtifact,
      releaseArtifact,
    })) {
      stdout(line);
    }

    return config.requireReady && !releaseArtifact.releaseReady ? 1 : 0;
  } catch (error) {
    stderr(`Release handoff failed: ${readErrorMessage(error)}`);
    return 1;
  }
}

export function readReleaseHandoffCliConfig(args = []) {
  const normalizedArgs = stripPnpmSeparator(args);
  const config = {
    projectStatusMarkdownPath: normalizeProjectStatusMarkdownPath(
      defaultProjectStatusMarkdownPath,
    ),
    projectStatusOutputPath: normalizeProjectStatusPath(
      defaultProjectStatusOutputPath,
    ),
    releaseCheckMarkdownPath: normalizeReleaseCheckMarkdownPath(
      defaultReleaseCheckMarkdownPath,
    ),
    releaseCheckOutputPath: normalizeReleaseEvidencePath(
      defaultReleaseCheckOutputPath,
    ),
    requireReady: false,
    smokeReportPath: null,
    visualArtifactDir: null,
    visualManifestPath: null,
  };

  for (let index = 0; index < normalizedArgs.length; index += 1) {
    const arg = normalizedArgs[index];

    if (arg === "--latest") {
      config.smokeReportPath = null;
      continue;
    }

    if (arg === "--require-ready") {
      config.requireReady = true;
      continue;
    }

    if (arg === "--smoke-report") {
      config.smokeReportPath = readOptionValue(arg, normalizedArgs, index);
      index += 1;
      continue;
    }

    if (arg === "--visual-artifact-dir") {
      config.visualArtifactDir = readOptionValue(arg, normalizedArgs, index);
      index += 1;
      continue;
    }

    if (arg === "--visual-manifest") {
      config.visualManifestPath = readOptionValue(arg, normalizedArgs, index);
      index += 1;
      continue;
    }

    if (arg === "--release-check-output") {
      config.releaseCheckOutputPath = normalizeReleaseEvidencePath(
        readOptionValue(arg, normalizedArgs, index),
      );
      index += 1;
      continue;
    }

    if (arg === "--release-check-markdown") {
      config.releaseCheckMarkdownPath = normalizeReleaseCheckMarkdownPath(
        readOptionValue(arg, normalizedArgs, index),
      );
      index += 1;
      continue;
    }

    if (arg === "--project-status-output") {
      config.projectStatusOutputPath = normalizeProjectStatusPath(
        readOptionValue(arg, normalizedArgs, index),
      );
      index += 1;
      continue;
    }

    if (arg === "--project-status-markdown") {
      config.projectStatusMarkdownPath = normalizeProjectStatusMarkdownPath(
        readOptionValue(arg, normalizedArgs, index),
      );
      index += 1;
      continue;
    }

    if (arg.startsWith("-")) {
      throw new Error(`Unknown release handoff option: ${arg}`);
    }

    if (config.smokeReportPath) {
      throw new Error("Provide only one smoke report path.");
    }

    config.smokeReportPath = arg;
  }

  return config;
}

export function formatReleaseHandoffSummary(input) {
  const nextAction = input.projectArtifact.nextActions[0];

  return [
    "Release handoff written:",
    `  Status: ${input.projectArtifact.status}`,
    `  Release ready: ${input.releaseArtifact.releaseReady ? "yes" : "no"}`,
    `  Blockers: ${input.releaseArtifact.blockerCount}`,
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
  --project-status-output <path>
                               Write project-status.v1 JSON.
  --project-status-markdown <path>
                               Write project status Markdown handoff.
  -h, --help                   Show this help.

Release handoff:
  Writes release-check.json, release-check.md, project-status.json, and
  project-status.md from the same release gate read. Blocked evidence still
  writes the handoff; use --require-ready when the command should gate release.`);
}

function createReleaseCheckArgs(config) {
  const args = [
    "--checklist",
    "--all-visual-tasks",
    "--output",
    config.releaseCheckOutputPath,
    "--markdown-output",
    config.releaseCheckMarkdownPath,
  ];

  if (config.smokeReportPath) {
    args.push("--smoke-report", config.smokeReportPath);
  }

  if (config.visualArtifactDir) {
    args.push("--visual-artifact-dir", config.visualArtifactDir);
  }

  if (config.visualManifestPath) {
    args.push("--visual-manifest", config.visualManifestPath);
  }

  return args;
}

function formatNextAction(action) {
  if (!action) {
    return "None";
  }

  return formatSmokeText(`${action.area}: ${action.label} - ${action.action}`, {
    maxLength: 420,
  });
}

function readOptionValue(option, args, index) {
  const value = args[index + 1];

  if (!value || value.startsWith("--")) {
    throw new Error(`${option} requires a value.`);
  }

  return value;
}

function stripPnpmSeparator(args) {
  return args[0] === "--" ? args.slice(1) : args;
}
