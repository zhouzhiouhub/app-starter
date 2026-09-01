import { runPageBuilderVisualReferenceRequestCli } from "../page-builder-visual-reference-request.mjs";
import { runProductionSmokeRequestCli } from "../smoke/production-smoke-request.mjs";
import { readErrorMessage } from "../smoke/smoke-error-message.mjs";
import { runReleaseEvidenceRequestCli } from "./release-evidence-request.mjs";
import {
  readPageBuilderVisualArtifactDir,
} from "../visual/page-builder-visual-artifact-check-config.mjs";
import {
  createArtifactPaths,
} from "../visual/page-builder-visual-artifact-check-paths.mjs";
import {
  defaultReleaseRequestsOutputPaths,
} from "./release-requests-config.mjs";

export {
  createReleaseRequestsCommand,
  createReleaseRequestsOutputSummary,
  defaultReleaseRequestsOutputPaths,
} from "./release-requests-config.mjs";

const releaseOnlyFlags = new Set(["--latest"]);
const releaseOnlyValueOptions = new Set(["--smoke-report"]);
const smokeValueOptions = new Set([
  "--local-verification-artifact",
  "--local-verification-artifact-name",
  "--local-verification-run-url",
  "--ref",
  "--release-tag",
  "--rollback-target",
  "--storefront-url",
  "--visual-artifact",
  "--visual-artifact-name",
  "--visual-artifact-run-id",
  "--workflow-file",
]);
const visualSourceOptions = new Set(["--source-dir", "--visual-source-dir"]);
const visualManifestOptions = new Set(["--manifest", "--visual-manifest"]);

export async function runReleaseRequestsCli(args = [], input = {}) {
  const stdout = input.stdout ?? console.log;
  const stderr = input.stderr ?? console.error;

  if (args.includes("--help") || args.includes("-h")) {
    printHelp(stdout);
    return 0;
  }

  try {
    const config = readReleaseRequestsCliConfig(args);

    stdout("Release evidence request bundle");
    const releaseExit = await runReleaseEvidenceRequestCli(
      config.releaseEvidenceArgs,
      input,
    );
    if (releaseExit !== 0) {
      return releaseExit;
    }

    const visualExit = await runPageBuilderVisualReferenceRequestCli(
      config.visualReferenceArgs,
      input,
    );
    if (visualExit !== 0) {
      return visualExit;
    }

    const smokeExit = await runProductionSmokeRequestCli(
      config.productionSmokeArgs,
      input,
    );
    if (smokeExit !== 0) {
      return smokeExit;
    }

    stdout("Release request files refreshed:");
    stdout(`  - Release evidence: ${config.outputPaths.releaseEvidence}`);
    stdout(`  - Page Builder design: ${config.outputPaths.visualReference}`);
    stdout(
      `  - Page Builder missing paths: ${config.outputPaths.visualMissingReferences}`,
    );
    stdout(`  - Production Smoke: ${config.outputPaths.productionSmoke}`);
    return 0;
  } catch (error) {
    stderr(`Release requests failed: ${readErrorMessage(error)}`);
    return 1;
  }
}

export function readReleaseRequestsCliConfig(args = []) {
  const config = {
    outputPaths: { ...defaultReleaseRequestsOutputPaths },
    productionSmokeArgs: [],
    releaseEvidenceArgs: [],
    visualArtifactManifestPath: null,
    visualReferenceArgs: [
      "--missing-output",
      defaultReleaseRequestsOutputPaths.visualMissingReferences,
    ],
  };
  const normalizedArgs = stripPnpmSeparator(args);

  for (let index = 0; index < normalizedArgs.length; index += 1) {
    const { option, value } = splitInlineOption(normalizedArgs[index]);

    if (option === "--release-output") {
      const outputPath = readOptionValue(option, normalizedArgs, index, value);
      setValueOption(config.releaseEvidenceArgs, "--output", outputPath);
      config.outputPaths.releaseEvidence = outputPath;
      index += value === null ? 1 : 0;
      continue;
    }

    if (option === "--visual-output") {
      const outputPath = readOptionValue(option, normalizedArgs, index, value);
      setValueOption(config.visualReferenceArgs, "--output", outputPath);
      config.outputPaths.visualReference = outputPath;
      index += value === null ? 1 : 0;
      continue;
    }

    if (option === "--visual-missing-output" || option === "--missing-output") {
      const outputPath = readOptionValue(option, normalizedArgs, index, value);
      setValueOption(
        config.visualReferenceArgs,
        "--missing-output",
        outputPath,
      );
      config.outputPaths.visualMissingReferences = outputPath;
      index += value === null ? 1 : 0;
      continue;
    }

    if (option === "--smoke-output") {
      const outputPath = readOptionValue(option, normalizedArgs, index, value);
      setValueOption(config.productionSmokeArgs, "--output", outputPath);
      config.outputPaths.productionSmoke = outputPath;
      index += value === null ? 1 : 0;
      continue;
    }

    if (visualSourceOptions.has(option)) {
      const sourceDir = readOptionValue(option, normalizedArgs, index, value);
      setValueOption(
        config.releaseEvidenceArgs,
        "--visual-source-dir",
        sourceDir,
      );
      setValueOption(config.visualReferenceArgs, "--source-dir", sourceDir);
      index += value === null ? 1 : 0;
      continue;
    }

    if (visualManifestOptions.has(option)) {
      const manifestPath = readOptionValue(option, normalizedArgs, index, value);
      setValueOption(
        config.releaseEvidenceArgs,
        "--visual-manifest",
        manifestPath,
      );
      setValueOption(config.visualReferenceArgs, "--manifest", manifestPath);
      index += value === null ? 1 : 0;
      continue;
    }

    if (option === "--visual-artifact-dir") {
      const artifactDir = readPageBuilderVisualArtifactDir(
        readOptionValue(option, normalizedArgs, index, value),
      );
      setValueOption(config.releaseEvidenceArgs, option, artifactDir);
      config.visualArtifactManifestPath = createArtifactPaths(artifactDir)
        .manifest;
      index += value === null ? 1 : 0;
      continue;
    }

    if (releaseOnlyFlags.has(option)) {
      config.releaseEvidenceArgs.push(option);
      continue;
    }

    if (releaseOnlyValueOptions.has(option)) {
      const optionValue = readOptionValue(option, normalizedArgs, index, value);
      appendValueOption(config.releaseEvidenceArgs, option, optionValue);
      index += value === null ? 1 : 0;
      continue;
    }

    if (smokeValueOptions.has(option)) {
      const optionValue = readOptionValue(option, normalizedArgs, index, value);
      appendValueOption(config.releaseEvidenceArgs, option, optionValue);
      appendValueOption(config.productionSmokeArgs, option, optionValue);
      index += value === null ? 1 : 0;
      continue;
    }

    throw new Error(`Unknown release requests option: ${option}`);
  }

  if (config.visualArtifactManifestPath) {
    setValueOption(
      config.visualReferenceArgs,
      "--manifest",
      config.visualArtifactManifestPath,
    );
  }

  return {
    outputPaths: config.outputPaths,
    productionSmokeArgs: config.productionSmokeArgs,
    releaseEvidenceArgs: config.releaseEvidenceArgs,
    visualReferenceArgs: config.visualReferenceArgs,
  };
}

function appendValueOption(target, option, value) {
  target.push(option, value);
}

function setValueOption(target, option, value) {
  const optionIndex = target.indexOf(option);

  if (optionIndex !== -1) {
    target.splice(optionIndex, 2);
  }

  appendValueOption(target, option, value);
}

function splitInlineOption(arg) {
  const equalsIndex = arg.indexOf("=");

  return equalsIndex === -1
    ? { option: arg, value: null }
    : {
        option: arg.slice(0, equalsIndex),
        value: arg.slice(equalsIndex + 1),
      };
}

function readOptionValue(option, args, index, inlineValue) {
  if (inlineValue !== null) {
    return inlineValue;
  }

  const value = args[index + 1];

  if (!value || value.startsWith("--")) {
    throw new Error(`${option} requires a value.`);
  }

  return value;
}

function stripPnpmSeparator(args) {
  return args[0] === "--" ? args.slice(1) : args;
}

function printHelp(writeLine) {
  writeLine(`Usage:
  pnpm release:requests
  pnpm release:requests -- --visual-artifact page-builder-visual-fixture-123 --visual-artifact-run-id 456
  pnpm release:requests -- --release-output tmp/release.md --visual-output tmp/visual.md --visual-missing-output tmp/missing.txt --smoke-output tmp/smoke.md

Outputs:
  --release-output <path>  Combined release evidence request Markdown.
  --visual-output <path>   Page Builder design reference request Markdown.
  --visual-missing-output <path>
                           Plain text missing Page Builder reference paths.
  --smoke-output <path>    Production Smoke request Markdown.

Shared evidence inputs:
  --source-dir <dir> or --visual-source-dir <dir>
  --manifest <path> or --visual-manifest <path>
  --smoke-report <path>
  --visual-artifact-dir <dir>
  Production Smoke inputs accepted by pnpm smoke:request, including
  --visual-artifact, --visual-artifact-run-id,
  --local-verification-run-url, --local-verification-artifact,
  --release-tag, --rollback-target, and --storefront-url.

Evidence:
  This command refreshes all local evidence request files and the missing Page
  Builder reference path list for blocked release handoff. It does not import
  visual references, run Production Smoke, create release notes, upload
  artifacts, or mark the project ready.`);
}
