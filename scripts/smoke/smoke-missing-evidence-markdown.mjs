import { formatSmokeText } from "./smoke-text.mjs";

const maxMarkdownTextLength = 420;

const requiredProductionSmokeEvidence = [
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

const productionSmokeWorkflowInputs = [
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
  ];
}

function readSmokeSummaryStatus(smoke) {
  return smoke?.summaryStatus ?? smoke?.summary?.status;
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
