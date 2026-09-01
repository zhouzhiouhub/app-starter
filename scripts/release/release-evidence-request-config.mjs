import { readProductionSmokeDispatchCliConfig } from "../smoke/production-smoke-dispatch-cli.mjs";
import {
  defaultProductionSmokeDispatchInputsOutputPath,
  normalizeProductionSmokeDispatchInputsOutputPath,
} from "../smoke/production-smoke-dispatch-inputs-output.mjs";
import {
  normalizeProductionSmokeDispatchInputsTableOutputPath,
} from "../smoke/production-smoke-dispatch-inputs-table-path.mjs";
import {
  normalizeProductionSmokeRequestOutputPath,
} from "../smoke/production-smoke-request.mjs";
import { defaultPageBuilderVisualReferenceSourceDir } from "../visual/page-builder-visual-acceptance-constants.mjs";
import { defaultPageBuilderVisualArtifactDir } from "../visual/page-builder-visual-artifact-check-config.mjs";
import { createArtifactPaths } from "../visual/page-builder-visual-artifact-check-paths.mjs";
import {
  normalizeVisualReferenceImportMarkdownOutputPath,
  normalizeVisualReferenceSourceDir,
} from "../visual/page-builder-visual-reference-import-config.mjs";
import {
  normalizeVisualReferenceExportTableOutputPath,
  normalizeVisualReferenceMissingOutputPath,
} from "../visual/page-builder-visual-reference-request.mjs";
import { readErrorMessage } from "../smoke/smoke-error-message.mjs";
import { readReleaseCheckCliConfig } from "./release-check-config.mjs";
import {
  defaultReleaseEvidenceRequestOutputPath,
  defaultReleaseEvidenceRequestOutputPaths,
} from "./release-evidence-request-output-paths.mjs";
import { normalizeReleaseCheckMarkdownPath } from "./release-notes-validation.mjs";

export {
  createReleaseEvidenceRequestCommand,
  defaultReleaseEvidenceRequestOutputPath,
} from "./release-evidence-request-output-paths.mjs";

export const defaultReleaseEvidenceRequestVisualManifestPath =
  createArtifactPaths(defaultPageBuilderVisualArtifactDir).manifest;

const releaseCheckFlags = new Set(["--latest"]);
const releaseCheckValueOptions = new Set([
  "--smoke-report",
  "--visual-artifact-dir",
  "--visual-manifest",
]);
const smokeDispatchValueOptions = new Set([
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

export function readReleaseEvidenceRequestCliConfig(args = []) {
  const input = {
    outputPath: defaultReleaseEvidenceRequestOutputPath,
    releaseCheckArgs: [],
    requestOutputPaths: { ...defaultReleaseEvidenceRequestOutputPaths },
    smokeDispatchArgs: [],
    smokeInputsTableOutputPath:
      defaultReleaseEvidenceRequestOutputPaths.productionSmokeInputsTable,
    smokeInputsOutputPath: defaultProductionSmokeDispatchInputsOutputPath,
    visualManifestPath: defaultReleaseEvidenceRequestVisualManifestPath,
    visualSourceDir: defaultPageBuilderVisualReferenceSourceDir,
  };
  const normalizedArgs = stripPnpmSeparator(args);

  for (let index = 0; index < normalizedArgs.length; index += 1) {
    const { option, value } = splitInlineOption(normalizedArgs[index]);

    if (option === "--output") {
      input.outputPath = readOptionValue(option, normalizedArgs, index, value);
      input.requestOutputPaths.releaseEvidence = input.outputPath;
      index += value === null ? 1 : 0;
      continue;
    }

    if (option === "--visual-output") {
      input.requestOutputPaths.visualReference = readOptionValue(
        option,
        normalizedArgs,
        index,
        value,
      );
      index += value === null ? 1 : 0;
      continue;
    }

    if (option === "--visual-missing-output" || option === "--missing-output") {
      input.requestOutputPaths.visualMissingReferences = readOptionValue(
        option,
        normalizedArgs,
        index,
        value,
      );
      index += value === null ? 1 : 0;
      continue;
    }

    if (option === "--visual-table-output" || option === "--table-output") {
      input.requestOutputPaths.visualReferenceTable = readOptionValue(
        option,
        normalizedArgs,
        index,
        value,
      );
      index += value === null ? 1 : 0;
      continue;
    }

    if (option === "--smoke-output") {
      input.requestOutputPaths.productionSmoke = readOptionValue(
        option,
        normalizedArgs,
        index,
        value,
      );
      index += value === null ? 1 : 0;
      continue;
    }

    if (option === "--smoke-inputs-output" || option === "--inputs-output") {
      input.smokeInputsOutputPath = readOptionValue(
        option,
        normalizedArgs,
        index,
        value,
      );
      input.requestOutputPaths.productionSmokeInputs =
        input.smokeInputsOutputPath;
      index += value === null ? 1 : 0;
      continue;
    }

    if (option === "--smoke-inputs-table-output") {
      input.smokeInputsTableOutputPath = readOptionValue(
        option,
        normalizedArgs,
        index,
        value,
      );
      input.requestOutputPaths.productionSmokeInputsTable =
        input.smokeInputsTableOutputPath;
      index += value === null ? 1 : 0;
      continue;
    }

    if (option === "--source-dir" || option === "--visual-source-dir") {
      input.visualSourceDir = readOptionValue(
        option,
        normalizedArgs,
        index,
        value,
      );
      index += value === null ? 1 : 0;
      continue;
    }

    if (releaseCheckFlags.has(option)) {
      input.releaseCheckArgs.push(option);
      continue;
    }

    if (releaseCheckValueOptions.has(option)) {
      const optionValue = readOptionValue(option, normalizedArgs, index, value);
      if (option === "--visual-manifest") {
        input.visualManifestPath = optionValue;
      }
      index = appendValueOption(
        input.releaseCheckArgs,
        option,
        optionValue,
        index,
        value !== null,
      );
      continue;
    }

    if (smokeDispatchValueOptions.has(option)) {
      const optionValue = readOptionValue(option, normalizedArgs, index, value);
      index = appendValueOption(
        input.smokeDispatchArgs,
        option,
        optionValue,
        index,
        value !== null,
      );
      continue;
    }

    if (option.startsWith("-")) {
      throw new Error(`Unknown release evidence request option: ${option}`);
    }

    input.releaseCheckArgs.push(normalizedArgs[index]);
  }

  const releaseCheckConfig = readReleaseCheckCliConfig(input.releaseCheckArgs);
  const outputPath = normalizeReleaseEvidenceRequestOutputPath(input.outputPath);
  const smokeInputsOutputPath = normalizeProductionSmokeDispatchInputsOutputPath(input.smokeInputsOutputPath);
  const smokeInputsTableOutputPath =
    normalizeProductionSmokeDispatchInputsTableOutputPath(
      input.smokeInputsTableOutputPath,
    );

  return {
    outputPath,
    releaseCheckConfig,
    requestOutputPaths: {
      productionSmoke: normalizeProductionSmokeRequestOutputPath(
        input.requestOutputPaths.productionSmoke,
      ),
      productionSmokeInputs: smokeInputsOutputPath,
      productionSmokeInputsTable: smokeInputsTableOutputPath,
      releaseEvidence: outputPath,
      visualMissingReferences: normalizeVisualReferenceMissingOutputPath(
        input.requestOutputPaths.visualMissingReferences,
      ),
      visualReference: normalizeVisualReferenceImportMarkdownOutputPath(
        input.requestOutputPaths.visualReference,
      ),
      visualReferenceTable: normalizeVisualReferenceExportTableOutputPath(
        input.requestOutputPaths.visualReferenceTable,
      ),
    },
    smokeDispatchConfig: readProductionSmokeDispatchCliConfig(
      input.smokeDispatchArgs,
    ),
    smokeInputsOutputPath,
    smokeInputsTableOutputPath,
    visualManifestPath:
      releaseCheckConfig.visualArtifactDir
        ? releaseCheckConfig.visualManifestPath
        : input.visualManifestPath,
    visualSourceDir: normalizeVisualReferenceSourceDir(input.visualSourceDir),
  };
}

export function normalizeReleaseEvidenceRequestOutputPath(value) {
  try {
    return normalizeReleaseCheckMarkdownPath(value);
  } catch (error) {
    throw new Error(
      readErrorMessage(error).replaceAll(
        "Release check Markdown",
        "Release evidence request",
      ),
    );
  }
}

function appendValueOption(target, option, optionValue, index, hasInlineValue) {
  target.push(option, optionValue);
  return hasInlineValue ? index : index + 1;
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

function splitInlineOption(arg) {
  const equalsIndex = arg.indexOf("=");

  return equalsIndex === -1
    ? { option: arg, value: null }
    : {
        option: arg.slice(0, equalsIndex),
        value: arg.slice(equalsIndex + 1),
      };
}

function stripPnpmSeparator(args) {
  return args[0] === "--" ? args.slice(1) : args;
}
