import {
  defaultProductionSmokeDispatchInputsOutputPath,
} from "../smoke/production-smoke-dispatch-inputs-output.mjs";
import { defaultPageBuilderVisualReferenceSourceDir } from "../visual/page-builder-visual-acceptance-constants.mjs";
import { defaultPageBuilderVisualArtifactDir } from "../visual/page-builder-visual-artifact-check-config.mjs";
import { createArtifactPaths } from "../visual/page-builder-visual-artifact-check-paths.mjs";
import {
  defaultReleaseEvidenceRequestOutputPath,
  defaultReleaseEvidenceRequestOutputPaths,
} from "./release-evidence-request-output-paths.mjs";
import {
  appendValueOption,
  readOptionValue,
  splitInlineOption,
  stripPnpmSeparator,
} from "./release-cli-options.mjs";
import {
  createReleaseEvidenceRequestResolvedConfig,
} from "./release-evidence-request-config-normalization.mjs";

export {
  createReleaseEvidenceRequestCommand,
  defaultReleaseEvidenceRequestOutputPath,
} from "./release-evidence-request-output-paths.mjs";
export {
  normalizeReleaseEvidenceRequestOutputPath,
} from "./release-evidence-request-config-normalization.mjs";

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
    smokeInputsJsonOutputPath:
      defaultReleaseEvidenceRequestOutputPaths.productionSmokeInputsManifest,
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

    if (
      option === "--requests-manifest-output" ||
      option === "--release-requests-manifest-output" ||
      option === "--bundle-manifest-output"
    ) {
      input.requestOutputPaths.releaseRequestsManifest = readOptionValue(
        option,
        normalizedArgs,
        index,
        value,
      );
      index += value === null ? 1 : 0;
      continue;
    }

    if (option === "--project-status-output") {
      input.requestOutputPaths.projectStatus = readOptionValue(
        option,
        normalizedArgs,
        index,
        value,
      );
      index += value === null ? 1 : 0;
      continue;
    }

    if (option === "--project-status-markdown") {
      input.requestOutputPaths.projectStatusMarkdown = readOptionValue(
        option,
        normalizedArgs,
        index,
        value,
      );
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

    if (option === "--visual-json-output" || option === "--json-output") {
      input.requestOutputPaths.visualReferenceManifest = readOptionValue(
        option,
        normalizedArgs,
        index,
        value,
      );
      index += value === null ? 1 : 0;
      continue;
    }

    if (
      option === "--visual-handoff-output" ||
      option === "--visual-handoff-output-dir" ||
      option === "--handoff-output-dir"
    ) {
      input.requestOutputPaths.visualReferenceHandoff = readOptionValue(
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

    if (
      option === "--smoke-inputs-json-output" ||
      option === "--inputs-json-output" ||
      option === "--inputs-manifest-output"
    ) {
      input.smokeInputsJsonOutputPath = readOptionValue(
        option,
        normalizedArgs,
        index,
        value,
      );
      input.requestOutputPaths.productionSmokeInputsManifest =
        input.smokeInputsJsonOutputPath;
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
      appendValueOption(input.releaseCheckArgs, option, optionValue);
      index += value === null ? 1 : 0;
      continue;
    }

    if (smokeDispatchValueOptions.has(option)) {
      const optionValue = readOptionValue(option, normalizedArgs, index, value);
      appendValueOption(input.smokeDispatchArgs, option, optionValue);
      index += value === null ? 1 : 0;
      continue;
    }

    if (option.startsWith("-")) {
      throw new Error(`Unknown release evidence request option: ${option}`);
    }

    input.releaseCheckArgs.push(normalizedArgs[index]);
  }

  return createReleaseEvidenceRequestResolvedConfig(input);
}
