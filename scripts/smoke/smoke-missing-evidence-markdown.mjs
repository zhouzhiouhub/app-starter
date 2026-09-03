import { formatSmokeText } from "./smoke-text.mjs";
import {
  createProductionSmokeDispatchCommand,
  createProductionSmokeDispatchManifestValidationCommand,
  createProductionSmokeManualDispatchInstruction,
  createProductionSmokeRequestCommand,
  productionSmokeDispatchInputs,
} from "./production-smoke-dispatch-command.mjs";
import {
  readProductionSmokeDispatchInputMissingReason,
} from "./production-smoke-dispatch-input-reason.mjs";
import {
  defaultProductionSmokeDispatchInputsOutputPath,
} from "./production-smoke-dispatch-inputs-output.mjs";
import {
  defaultProductionSmokeDispatchInputsTableOutputPath,
} from "./production-smoke-dispatch-inputs-table-path.mjs";
import {
  defaultProductionSmokeDispatchInputsManifestOutputPath,
} from "./production-smoke-dispatch-inputs-manifest-path.mjs";
import {
  productionSmokeEvidenceInputSources,
} from "./production-smoke-evidence-input-sources.mjs";
import {
  isProductionSmokeReleaseEvidenceInput,
  productionSmokeWorkflowInputs,
  readProductionSmokeReleaseEvidenceRequirement,
  readProductionSmokeWorkflowRequirement,
} from "./production-smoke-workflow-inputs.mjs";

const maxMarkdownTextLength = 420;
const productionSmokeDispatchCommand = createProductionSmokeDispatchCommand();
const productionSmokeDispatchValidationCommand =
  createProductionSmokeDispatchManifestValidationCommand();
const productionSmokeManualDispatch =
  createProductionSmokeManualDispatchInstruction();
const productionSmokeRequestCommand = createProductionSmokeRequestCommand();

export const requiredProductionSmokeEvidence = [
  {
    label: "Production smoke request",
    value: productionSmokeRequestCommand,
  },
  {
    label: "Dispatch inputs output",
    value: defaultProductionSmokeDispatchInputsOutputPath,
  },
  {
    label: "Dispatch inputs table output",
    value: defaultProductionSmokeDispatchInputsTableOutputPath,
  },
  {
    label: "Dispatch inputs JSON output",
    value: defaultProductionSmokeDispatchInputsManifestOutputPath,
  },
  {
    label: "Workflow dispatch validation",
    value: productionSmokeDispatchValidationCommand,
  },
  {
    label: "Workflow dispatch template",
    value: productionSmokeDispatchCommand,
  },
  {
    label: "Workflow manual dispatch",
    value: productionSmokeManualDispatch,
  },
  {
    label: "Workflow",
    value: "GitHub Actions Production Smoke against the production environment",
  },
  {
    label: "Smoke report JSON",
    value: "artifacts/production-smoke/smoke-report.json",
  },
  {
    label: "Smoke report Markdown",
    value: "artifacts/production-smoke/smoke-report.md",
  },
  {
    label: "Preflight artifact",
    value: "release-preflight-<run_number>",
  },
  {
    label: "Smoke artifact",
    value: "production-smoke-report-<run_number>",
  },
  {
    label: "Release evidence artifact",
    value: "release-evidence-check-<run_number>",
  },
  {
    label: "Project status artifact",
    value: "project-status-<run_number>",
  },
  {
    label: "Rerun gate",
    value:
      "pnpm release:check -- --smoke-report <path> --visual-artifact-dir reports/visual/page-builder-fixture",
  },
];

export function formatMissingProductionSmokeEvidence(smoke) {
  if (smoke?.status === "ready") {
    return [];
  }

  return [
    "",
    "### Missing Production Smoke Evidence",
    "",
    `- Status: ${formatCode(smoke?.status)}`,
    `- Smoke summary: ${formatCode(readSmokeSummaryStatus(smoke))}`,
    ...formatSmokeMarkdown(smoke?.markdown),
    ...requiredProductionSmokeEvidence.map(
      (item) => `- ${item.label}: ${formatCode(item.value)}`,
    ),
    "",
    "### Production Smoke Dispatch Input Replacements",
    "",
    ...productionSmokeDispatchInputs.map(formatProductionSmokeDispatchInput),
    "",
    "### Production Smoke Workflow Inputs",
    "",
    ...productionSmokeWorkflowInputs.map(formatProductionSmokeWorkflowInput),
    "",
    "### Production Smoke Evidence Input Sources",
    "",
    ...productionSmokeEvidenceInputSources.map(formatEvidenceInputSource),
  ];
}

export function createMissingProductionSmokeEvidenceArtifact(smoke) {
  if (smoke?.releaseReady === true || smoke?.status === "ready") {
    return null;
  }

  const requiredEvidence = requiredProductionSmokeEvidence.map(
    createRequiredSmokeEvidenceItem,
  );
  const dispatchInputs = productionSmokeDispatchInputs.map(
    createProductionSmokeDispatchInputItem,
  );
  const inputSources = productionSmokeEvidenceInputSources.map(
    createEvidenceInputSourceItem,
  );
  const workflowInputs = productionSmokeWorkflowInputs.map(
    createSmokeWorkflowInputItem,
  );

  return {
    dispatchInputCount: dispatchInputs.length,
    dispatchInputs,
    inputSourceCount: inputSources.length,
    inputSources,
    requiredEvidence,
    requiredEvidenceCount: requiredEvidence.length,
    status: formatText(smoke?.status ?? "blocked"),
    summaryStatus: formatText(readSmokeSummaryStatus(smoke)),
    workflowInputCount: workflowInputs.length,
    workflowInputs,
  };
}

function readSmokeSummaryStatus(smoke) {
  return smoke?.summaryStatus ?? smoke?.summary?.status;
}

function createRequiredSmokeEvidenceItem(item) {
  return {
    label: formatText(item.label),
    value: formatText(item.value),
  };
}

function createProductionSmokeDispatchInputItem(input) {
  return {
    missingReason: formatText(
      readProductionSmokeDispatchInputMissingReason({
        ...input,
        placeholder: true,
      }),
    ),
    name: formatText(input.name),
    status: "missing",
    value: formatText(input.value),
  };
}

function createEvidenceInputSourceItem(item) {
  return {
    name: formatText(item.name),
    source: formatText(item.source),
    value: formatText(item.value),
  };
}

function createSmokeWorkflowInputItem(input) {
  return {
    description: formatText(input.description),
    name: formatText(input.name),
    releaseEvidenceRequired: isProductionSmokeReleaseEvidenceInput(input.name),
    required: input.required === true,
    value: formatText(input.value),
  };
}

function formatSmokeMarkdown(markdown) {
  if (!markdown) {
    return [];
  }

  return [
    `- Markdown companion: ${formatCode(markdown.status)}${
      markdown.path ? ` (${formatCode(markdown.path)})` : ""
    }`,
  ];
}

function formatProductionSmokeWorkflowInput(input) {
  return `- ${formatCode(input.name)}: ${formatCode(
    input.value,
  )} (${formatText(readProductionSmokeWorkflowRequirement(input))}; ${formatText(
    readProductionSmokeReleaseEvidenceRequirement(input.name),
  )}; ${formatText(input.description)})`;
}

function formatProductionSmokeDispatchInput(input) {
  return `- ${formatCode(input.name)}: ${formatCode(
    input.value,
  )} - missing; ${formatText(
    readProductionSmokeDispatchInputMissingReason({
      ...input,
      placeholder: true,
    }),
  )}`;
}

function formatEvidenceInputSource(input) {
  return `- ${formatCode(input.name)}: ${formatCode(
    input.value,
  )} - ${formatText(input.source)}`;
}

function formatCode(value) {
  return `\`${formatText(value).replaceAll("`", "'")}\``;
}

function formatText(value) {
  return formatSmokeText(value, {
    fallback: "unknown",
    maxLength: maxMarkdownTextLength,
  });
}
