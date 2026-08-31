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

function formatCode(value) {
  return `\`${formatText(value).replaceAll("`", "'")}\``;
}

function formatText(value) {
  return formatSmokeText(value, {
    fallback: "unknown",
    maxLength: maxMarkdownTextLength,
  });
}
