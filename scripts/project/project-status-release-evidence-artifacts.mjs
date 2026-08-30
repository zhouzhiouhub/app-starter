import { formatSmokeText } from "../smoke/smoke-text.mjs";

export function formatReleaseEvidenceArtifacts() {
  return [
    "- Production Smoke JSON: `artifacts/production-smoke/smoke-report.json`",
    "- Production Smoke Markdown: `artifacts/production-smoke/smoke-report.md`",
    "- Production Smoke preflight JSON: `artifacts/release/preflight.json`",
    "- Production Smoke preflight Markdown: `artifacts/release/preflight.md`",
    "- Page Builder Visual bundle: `reports/visual/page-builder-fixture`",
    "- Page Builder Visual manifest: `reports/visual/page-builder-fixture/page-builder-visual-acceptance.json`",
    "- Page Builder Visual capture report JSON: `reports/visual/page-builder-fixture/visual-capture-report.json`",
    "- Page Builder Visual reference import JSON: `reports/visual/page-builder-fixture/visual-reference-import-report.json`",
    "- Page Builder Visual reference import Markdown: `reports/visual/page-builder-fixture/visual-reference-import-report.md`",
    "- Page Builder Visual acceptance JSON: `reports/visual/page-builder-fixture/visual-acceptance-report.json`",
    "- Page Builder Visual acceptance Markdown: `reports/visual/page-builder-fixture/visual-acceptance-report.md`",
    "- Page Builder Visual artifact check JSON: `reports/visual/page-builder-fixture/visual-artifact-check-report.json`",
    "- Page Builder Visual artifact check Markdown: `reports/visual/page-builder-fixture/visual-artifact-check-report.md`",
    "- Release evidence JSON: `artifacts/release/release-check.json`",
    "- Release evidence Markdown: `artifacts/release/release-check.md`",
    "- Project status JSON: `artifacts/release/project-status.json`",
    "- Project status Markdown: `artifacts/release/project-status.md`",
    "- Release notes Markdown: `docs/releases/<tag>.md`",
    `- Refresh Smoke review: ${formatCode(
      "pnpm smoke:report -- --markdown-output artifacts/production-smoke/smoke-report.md artifacts/production-smoke/smoke-report.json",
    )}`,
    `- Refresh Production Smoke preflight: ${formatCode(
      "pnpm release:preflight -- --json-output artifacts/release/preflight.json --markdown-output artifacts/release/preflight.md",
    )}`,
    `- Refresh visual bundle: ${formatCode(
      "pnpm visual:artifact-bundle -- --artifact-dir reports/visual/page-builder-fixture",
    )}`,
    `- Refresh visual references: ${formatCode(
      "pnpm visual:references -- --source-dir docs/visual/page-builder-references --manifest reports/visual/page-builder-fixture/page-builder-visual-acceptance.json --output reports/visual/page-builder-fixture/visual-reference-import-report.json --markdown-output reports/visual/page-builder-fixture/visual-reference-import-report.md --require-complete",
    )}`,
    `- Refresh visual capture: ${formatCode(
      "pnpm visual:capture:fixture -- --manifest reports/visual/page-builder-fixture/page-builder-visual-acceptance.json --output-dir reports/visual/page-builder-fixture --report reports/visual/page-builder-fixture/visual-capture-report.json --write-manifest",
    )}`,
    `- Refresh visual measurements: ${formatCode(
      "pnpm visual:measure -- --manifest reports/visual/page-builder-fixture/page-builder-visual-acceptance.json --write --require-complete",
    )}`,
    `- Accept passing visual evidence: ${formatCode(
      "pnpm visual:measure -- --manifest reports/visual/page-builder-fixture/page-builder-visual-acceptance.json --write --accept-passing --require-complete",
    )}`,
    `- Refresh visual acceptance report: ${formatCode(
      "pnpm visual:acceptance -- --checklist --output reports/visual/page-builder-fixture/visual-acceptance-report.json --markdown-output reports/visual/page-builder-fixture/visual-acceptance-report.md reports/visual/page-builder-fixture/page-builder-visual-acceptance.json",
    )}`,
    `- Refresh visual artifact check: ${formatCode(
      "pnpm visual:artifact-check -- --artifact-dir reports/visual/page-builder-fixture --output reports/visual/page-builder-fixture/visual-artifact-check-report.json --markdown-output reports/visual/page-builder-fixture/visual-artifact-check-report.md",
    )}`,
    `- Refresh release handoff: ${formatCode(
      "pnpm release:handoff -- --smoke-report artifacts/production-smoke/smoke-report.json --visual-artifact-dir reports/visual/page-builder-fixture",
    )}`,
  ];
}

function formatCode(value) {
  return `\`${formatText(value).replaceAll("`", "'")}\``;
}

function formatText(value) {
  return formatSmokeText(value, {
    fallback: "unknown",
    maxLength: 420,
  });
}
