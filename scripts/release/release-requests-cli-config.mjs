import {
  readPageBuilderVisualArtifactDir,
} from "../visual/page-builder-visual-artifact-check-config.mjs";
import {
  createArtifactPaths,
} from "../visual/page-builder-visual-artifact-check-paths.mjs";
import {
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

export function readReleaseRequestsCliConfig(args = []) {
  const config = {
    outputPaths: { ...defaultReleaseRequestsOutputPaths },
    productionSmokeArgs: [
      "--inputs-output",
      defaultReleaseRequestsOutputPaths.productionSmokeInputs,
      "--inputs-table-output",
      defaultReleaseRequestsOutputPaths.productionSmokeInputsTable,
      "--inputs-json-output",
      defaultReleaseRequestsOutputPaths.productionSmokeInputsManifest,
    ],
    releaseEvidenceArgs: [],
    visualArtifactManifestPath: null,
    visualReferenceArgs: [
      "--missing-output",
      defaultReleaseRequestsOutputPaths.visualMissingReferences,
      "--table-output",
      defaultReleaseRequestsOutputPaths.visualReferenceTable,
      "--json-output",
      defaultReleaseRequestsOutputPaths.visualReferenceManifest,
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
      setValueOption(config.releaseEvidenceArgs, "--visual-output", outputPath);
      setValueOption(config.visualReferenceArgs, "--output", outputPath);
      config.outputPaths.visualReference = outputPath;
      index += value === null ? 1 : 0;
      continue;
    }

    if (option === "--visual-missing-output" || option === "--missing-output") {
      const outputPath = readOptionValue(option, normalizedArgs, index, value);
      setValueOption(
        config.releaseEvidenceArgs,
        "--visual-missing-output",
        outputPath,
      );
      setValueOption(
        config.visualReferenceArgs,
        "--missing-output",
        outputPath,
      );
      config.outputPaths.visualMissingReferences = outputPath;
      index += value === null ? 1 : 0;
      continue;
    }

    if (option === "--visual-table-output" || option === "--table-output") {
      const outputPath = readOptionValue(option, normalizedArgs, index, value);
      setValueOption(
        config.releaseEvidenceArgs,
        "--visual-table-output",
        outputPath,
      );
      setValueOption(config.visualReferenceArgs, "--table-output", outputPath);
      config.outputPaths.visualReferenceTable = outputPath;
      index += value === null ? 1 : 0;
      continue;
    }

    if (option === "--visual-json-output" || option === "--json-output") {
      const outputPath = readOptionValue(option, normalizedArgs, index, value);
      setValueOption(
        config.releaseEvidenceArgs,
        "--visual-json-output",
        outputPath,
      );
      setValueOption(config.visualReferenceArgs, "--json-output", outputPath);
      config.outputPaths.visualReferenceManifest = outputPath;
      index += value === null ? 1 : 0;
      continue;
    }

    if (option === "--smoke-output") {
      const outputPath = readOptionValue(option, normalizedArgs, index, value);
      setValueOption(config.releaseEvidenceArgs, "--smoke-output", outputPath);
      setValueOption(config.productionSmokeArgs, "--output", outputPath);
      config.outputPaths.productionSmoke = outputPath;
      index += value === null ? 1 : 0;
      continue;
    }
    if (option === "--smoke-inputs-output" || option === "--inputs-output") {
      const outputPath = readOptionValue(option, normalizedArgs, index, value);
      setValueOption(
        config.releaseEvidenceArgs,
        "--smoke-inputs-output",
        outputPath,
      );
      setValueOption(config.productionSmokeArgs, "--inputs-output", outputPath);
      config.outputPaths.productionSmokeInputs = outputPath;
      index += value === null ? 1 : 0;
      continue;
    }
    if (option === "--smoke-inputs-table-output") {
      const outputPath = readOptionValue(option, normalizedArgs, index, value);
      setValueOption(
        config.releaseEvidenceArgs,
        "--smoke-inputs-table-output",
        outputPath,
      );
      setValueOption(
        config.productionSmokeArgs,
        "--inputs-table-output",
        outputPath,
      );
      config.outputPaths.productionSmokeInputsTable = outputPath;
      index += value === null ? 1 : 0;
      continue;
    }
    if (
      option === "--smoke-inputs-json-output" ||
      option === "--inputs-json-output" ||
      option === "--inputs-manifest-output"
    ) {
      const outputPath = readOptionValue(option, normalizedArgs, index, value);
      setValueOption(
        config.releaseEvidenceArgs,
        "--smoke-inputs-json-output",
        outputPath,
      );
      setValueOption(
        config.productionSmokeArgs,
        "--inputs-json-output",
        outputPath,
      );
      config.outputPaths.productionSmokeInputsManifest = outputPath;
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
