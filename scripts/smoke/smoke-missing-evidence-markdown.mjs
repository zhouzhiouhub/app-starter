import { formatSmokeText } from "./smoke-text.mjs";
import {
  createProductionSmokeDispatchCommand,
  createProductionSmokeDispatchManifestValidationCommand,
  createProductionSmokeManualDispatchInstruction,
  createProductionSmokeRequestCommand,
} from "./production-smoke-dispatch-command.mjs";
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

export const productionSmokeWorkflowInputs = [
  {
    description: "safe JSON output path",
    name: "report_path",
    required: true,
    value: "artifacts/production-smoke/smoke-report.json",
  },
  {
    description: "keep Admin static app gate enabled for release",
    name: "require_admin_app",
    required: true,
    value: "true",
  },
  {
    description: "keep R2 upload and CDN gate enabled for release",
    name: "require_r2_upload",
    required: true,
    value: "true",
  },
  {
    description: "keep storefront ISR revalidation gate enabled for release",
    name: "require_revalidation",
    required: true,
    value: "true",
  },
  {
    description: "optional public storefront host override",
    name: "storefront_host",
    required: false,
    value: "<empty>",
  },
  {
    description:
      "release note tag, required with the other release note inputs",
    name: "release_tag",
    required: false,
    value: "<tag>",
  },
  {
    description: "rollback target, required with release notes",
    name: "rollback_target",
    required: false,
    value: "<target>",
  },
  {
    description: "main CI run URL for local verification evidence",
    name: "local_verification_run_url",
    required: false,
    value: "<main CI run URL>",
  },
  {
    description: "main CI artifact name for local verification evidence",
    name: "local_verification_artifact_name",
    required: false,
    value: "local-verification-<run_number>",
  },
  {
    description: "Page Builder Visual artifact name",
    name: "visual_artifact_name",
    required: false,
    value: "page-builder-visual-fixture-<run_number>",
  },
  {
    description: "Page Builder Visual workflow run id",
    name: "visual_artifact_run_id",
    required: false,
    value: "<Page Builder Visual workflow run id>",
  },
  {
    description: "public HTTPS storefront URL for release notes",
    name: "storefront_url",
    required: false,
    value: "<public HTTPS storefront URL>",
  },
  {
    description: "safe Markdown output path",
    name: "release_notes_path",
    required: false,
    value: "artifacts/release/release-notes.md",
  },
  {
    description: "only true for failure review drafts",
    name: "allow_blocked_release_notes",
    required: true,
    value: "false",
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
  const inputSources = productionSmokeEvidenceInputSources.map(
    createEvidenceInputSourceItem,
  );
  const workflowInputs = productionSmokeWorkflowInputs.map(
    createSmokeWorkflowInputItem,
  );

  return {
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
  return `- ${formatCode(input.name)}: ${formatCode(input.value)} (${formatText(
    readRequirement(input),
  )}; ${formatText(input.description)})`;
}

function formatEvidenceInputSource(input) {
  return `- ${formatCode(input.name)}: ${formatCode(
    input.value,
  )} - ${formatText(input.source)}`;
}

function readRequirement(input) {
  return input.required ? "required" : "optional";
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
