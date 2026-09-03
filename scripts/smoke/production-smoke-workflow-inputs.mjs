import {
  productionSmokeEvidenceInputSources,
} from "./production-smoke-evidence-input-sources.mjs";

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

export function isProductionSmokeReleaseEvidenceInput(name) {
  return productionSmokeEvidenceInputSources.some((input) => input.name === name);
}

export function readProductionSmokeWorkflowRequirement(input) {
  return input.required ? "workflow required" : "workflow optional";
}

export function readProductionSmokeReleaseEvidenceRequirement(name) {
  return isProductionSmokeReleaseEvidenceInput(name)
    ? "release evidence required"
    : "release evidence optional";
}
