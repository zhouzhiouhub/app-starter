import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  parseProductionEnvironmentMatrix,
  parseProductionSmokeWorkflowEnvironment,
  shouldDocumentRuntimeEnvironmentVariable,
} from "./production-environment-docs.mjs";

const workflowPath = ".github/workflows/production-smoke.yml";
const ciWorkflowPath = ".github/workflows/ci.yml";
const checklistPath = "docs/development/release-checklist.md";
const infraReadmePath = "infra/README.md";

test("production smoke workflow archives and reviews smoke reports", async () => {
  const workflow = await readFile(workflowPath, "utf8");

  assert.match(workflow, /workflow_dispatch:/);
  assert.match(
    workflow,
    /default: "artifacts\/production-smoke\/smoke-report\.json"/,
  );
  assert.match(workflow, /release_tag:/);
  assert.match(workflow, /rollback_target:/);
  assert.match(workflow, /visual_artifact_name:/);
  assert.match(workflow, /visual_artifact_run_id:/);
  assert.match(workflow, /storefront_url:/);
  assert.match(workflow, /release_notes_path:/);
  assert.match(workflow, /allow_blocked_release_notes:/);
  assert.match(
    workflow,
    /Generate release notes as a failure review draft when evidence is blocked/,
  );
  assert.match(workflow, /default: "artifacts\/release\/release-notes\.md"/);
  assert.match(workflow, /permissions:/);
  assert.match(workflow, /actions: read/);
  assert.match(workflow, /contents: read/);
  assert.match(workflow, /SMOKE_REPORT_PATH: \$\{\{ inputs\.report_path \}\}/);
  assert.match(workflow, /SMOKE_REPORT_MARKDOWN_PATH:/);
  assert.match(workflow, /SMOKE_REQUIRE_ADMIN_APP:/);
  assert.match(workflow, /SMOKE_REQUIRE_R2_UPLOAD:/);
  assert.match(workflow, /SMOKE_REQUIRE_REVALIDATION:/);
  assert.match(workflow, /SMOKE_SOURCE_COMMIT_SHA: \$\{\{ github\.sha \}\}/);
  assert.match(
    workflow,
    /SMOKE_SOURCE_REPOSITORY: \$\{\{ github\.repository \}\}/,
  );
  assert.match(workflow, /SMOKE_SOURCE_RUN_ID: \$\{\{ github\.run_id \}\}/);
  assert.match(
    workflow,
    /SMOKE_SOURCE_RUN_NUMBER: \$\{\{ github\.run_number \}\}/,
  );
  assert.match(workflow, /SMOKE_SOURCE_WORKFLOW: \$\{\{ github\.workflow \}\}/);
  assert.match(
    workflow,
    /SMOKE_SOURCE_WORKFLOW_RUN_URL: https:\/\/github\.com\/\$\{\{ github\.repository \}\}\/actions\/runs\/\$\{\{ github\.run_id \}\}/,
  );
  assert.match(workflow, /APP_ENV: production/);
  assert.match(workflow, /pnpm smoke:publish/);
  assert.match(workflow, /if: always\(\)/);
  assert.match(
    workflow,
    /pnpm smoke:report -- --markdown-output "\$SMOKE_REPORT_MARKDOWN_PATH" "\$SMOKE_REPORT_PATH"/,
  );
  assert.match(workflow, /pnpm smoke:release-check -- "\$SMOKE_REPORT_PATH"/);
  assert.match(workflow, /RELEASE_CHECK_ARTIFACT_PATH:/);
  assert.match(workflow, /RELEASE_CHECK_ARTIFACT_NAME:/);
  assert.match(workflow, /RELEASE_CHECK_MARKDOWN_PATH:/);
  assert.match(workflow, /RELEASE_PREFLIGHT_ARTIFACT_NAME:/);
  assert.match(workflow, /RELEASE_PREFLIGHT_REPORT_PATH:/);
  assert.match(workflow, /RELEASE_PREFLIGHT_MARKDOWN_PATH:/);
  assert.match(workflow, /PROJECT_STATUS_ARTIFACT_NAME:/);
  assert.match(workflow, /PROJECT_STATUS_ARTIFACT_PATH:/);
  assert.match(workflow, /PROJECT_STATUS_MARKDOWN_PATH:/);
  assert.match(workflow, /RELEASE_NOTES_ARTIFACT_NAME:/);
  assert.match(
    workflow,
    /RELEASE_NOTES_ALLOW_BLOCKED: \$\{\{ inputs\.allow_blocked_release_notes \}\}/,
  );
  assert.match(
    workflow,
    /RELEASE_NOTES_PATH: \$\{\{ inputs\.release_notes_path \}\}/,
  );
  assert.match(
    workflow,
    /RELEASE_VISUAL_ARTIFACT_RUN_ID: \$\{\{ inputs\.visual_artifact_run_id \}\}/,
  );
  assert.match(workflow, /name: Validate release evidence inputs/);
  assert.match(
    workflow,
    /pnpm release:preflight -- --json-output "\$RELEASE_PREFLIGHT_REPORT_PATH" --markdown-output "\$RELEASE_PREFLIGHT_MARKDOWN_PATH"/,
  );
  assert.match(
    workflow,
    /name: Download Page Builder visual evidence artifact/,
  );
  assert.match(
    workflow,
    /inputs\.visual_artifact_name != '' && inputs\.visual_artifact_run_id != ''/,
  );
  assert.match(workflow, /actions\/download-artifact@v4/);
  assert.match(workflow, /run-id: \$\{\{ inputs\.visual_artifact_run_id \}\}/);
  assert.match(workflow, /github-token: \$\{\{ github\.token \}\}/);
  assert.match(workflow, /path: reports\/visual\/page-builder-fixture/);
  assert.match(workflow, /name: Check Page Builder visual evidence artifact/);
  assert.match(
    workflow,
    /pnpm visual:artifact-check -- --artifact-dir reports\/visual\/page-builder-fixture --markdown-output reports\/visual\/page-builder-fixture\/visual-artifact-check-report\.md/,
  );
  assert.match(workflow, /name: Write release handoff artifacts/);
  assert.match(workflow, /handoff_flags=\(/);
  assert.match(workflow, /--require-ready/);
  assert.match(
    workflow,
    /--release-check-output "\$RELEASE_CHECK_ARTIFACT_PATH"/,
  );
  assert.match(
    workflow,
    /--release-check-markdown "\$RELEASE_CHECK_MARKDOWN_PATH"/,
  );
  assert.match(
    workflow,
    /--project-status-output "\$PROJECT_STATUS_ARTIFACT_PATH"/,
  );
  assert.match(
    workflow,
    /--project-status-markdown "\$PROJECT_STATUS_MARKDOWN_PATH"/,
  );
  assert.match(
    workflow,
    /handoff_flags\+=\(--visual-artifact-dir reports\/visual\/page-builder-fixture\)/,
  );
  assert.match(workflow, /pnpm release:handoff -- "\$\{handoff_flags\[@\]\}"/);
  assert.match(workflow, /name: Generate release notes/);
  assert.match(
    workflow,
    /inputs\.release_tag != '' && inputs\.rollback_target != '' && inputs\.visual_artifact_name != '' && inputs\.visual_artifact_run_id != ''/,
  );
  assert.match(workflow, /pnpm release:notes --/);
  assert.match(workflow, /release_notes_flags=\(\)/);
  assert.match(workflow, /release_notes_flags\+=\(--allow-blocked\)/);
  assert.match(workflow, /"\$\{release_notes_flags\[@\]\}" \\/);
  assert.match(workflow, /--release-tag "\$RELEASE_TAG"/);
  assert.match(
    workflow,
    /--workflow-run-url "https:\/\/github\.com\/\$\{\{ github\.repository \}\}\/actions\/runs\/\$\{\{ github\.run_id \}\}"/,
  );
  assert.match(workflow, /--project-status "\$PROJECT_STATUS_ARTIFACT_PATH"/);
  assert.match(
    workflow,
    /--project-status-artifact "\$PROJECT_STATUS_ARTIFACT_NAME"/,
  );
  assert.match(workflow, /--release-check "\$RELEASE_CHECK_ARTIFACT_PATH"/);
  assert.match(workflow, /GITHUB_STEP_SUMMARY/);
  assert.match(workflow, /Report Markdown:/);
  assert.match(workflow, /Preflight report:/);
  assert.match(workflow, /Preflight Markdown:/);
  assert.match(workflow, /Preflight artifact:/);
  assert.match(workflow, /Release gate:/);
  assert.match(workflow, /Review Markdown:/);
  assert.match(workflow, /Release handoff gate:/);
  assert.match(workflow, /release:handoff -- --require-ready/);
  assert.match(
    workflow,
    /--release-check-markdown \$RELEASE_CHECK_MARKDOWN_PATH/,
  );
  assert.match(workflow, /Combined artifact:/);
  assert.match(workflow, /Combined Markdown:/);
  assert.match(
    workflow,
    /--project-status-markdown \$PROJECT_STATUS_MARKDOWN_PATH/,
  );
  assert.match(workflow, /Project status artifact:/);
  assert.match(workflow, /Project status Markdown:/);
  assert.match(workflow, /Release notes:/);
  assert.match(workflow, /Release notes artifact:/);
  assert.match(workflow, /Release notes mode:/);
  assert.match(workflow, /Source commit:/);
  assert.match(workflow, /Source workflow run:/);
  assert.match(workflow, /failure review draft/);
  assert.match(workflow, /ready evidence only/);
  assert.match(workflow, /Visual evidence artifact:/);
  assert.match(workflow, /Visual reference import:/);
  assert.match(workflow, /visual-reference-import-report\.md/);
  assert.match(workflow, /Visual artifact check:/);
  assert.match(workflow, /visual-artifact-check-report\.md/);
  assert.match(
    workflow,
    /skipped \(set visual_artifact_name and visual_artifact_run_id\)/,
  );
  assert.match(
    workflow,
    /skipped \(set release_tag, rollback_target, visual_artifact_name, and visual_artifact_run_id\)/,
  );
  assert.match(workflow, /SMOKE_REPORT_ARTIFACT_NAME:/);
  assert.match(workflow, /actions\/upload-artifact@v4/);
  assert.match(workflow, /\$\{\{ inputs\.report_path \}\}/);
  assert.match(workflow, /\$\{\{ env\.SMOKE_REPORT_MARKDOWN_PATH \}\}/);
  assert.match(workflow, /\$\{\{ env\.RELEASE_PREFLIGHT_REPORT_PATH \}\}/);
  assert.match(workflow, /\$\{\{ env\.RELEASE_PREFLIGHT_MARKDOWN_PATH \}\}/);
  assert.match(workflow, /\$\{\{ env\.RELEASE_CHECK_ARTIFACT_PATH \}\}/);
  assert.match(workflow, /\$\{\{ env\.RELEASE_CHECK_MARKDOWN_PATH \}\}/);
  assert.match(workflow, /\$\{\{ env\.PROJECT_STATUS_ARTIFACT_PATH \}\}/);
  assert.match(workflow, /\$\{\{ env\.PROJECT_STATUS_MARKDOWN_PATH \}\}/);
  assert.match(workflow, /path: \$\{\{ env\.RELEASE_NOTES_PATH \}\}/);
  assert.equal(
    matchCount(
      workflow,
      /inputs\.release_tag != '' && inputs\.rollback_target != '' && inputs\.visual_artifact_name != '' && inputs\.visual_artifact_run_id != ''/g,
    ),
    2,
  );
  assert.equal(matchCount(workflow, /if-no-files-found: error/g), 5);
  assert.doesNotMatch(workflow, /if-no-files-found: warn/);
  assert.match(workflow, /retention-days: 30/);
});

test("production smoke workflow keeps MVP release gates explicit", async () => {
  const workflow = await readFile(workflowPath, "utf8");

  assert.match(workflow, /COMMERCE_ENABLED: "false"/);
  assert.match(workflow, /MULTI_LOCALE_ENABLED: "false"/);
  assert.match(workflow, /PRODUCTION_API_URL/);
  assert.match(workflow, /PRODUCTION_WEB_URL/);
  assert.match(workflow, /PRODUCTION_ADMIN_URL/);
  assert.match(workflow, /PRODUCTION_R2_ACCESS_KEY_ID/);
  assert.match(workflow, /PRODUCTION_R2_BUCKET/);
  assert.match(workflow, /PRODUCTION_SMOKE_ADMIN_PASSWORD/);
});

test("release checklist requires archived smoke evidence", async () => {
  const checklist = await readFile(checklistPath, "utf8");

  assert.match(checklist, /Production Smoke/);
  assert.match(checklist, /artifacts\/production-smoke\/smoke-report\.json/);
  assert.match(checklist, /project-status-<run_number>/);
  assert.match(checklist, /project-status\.v1/);
  assert.match(checklist, /project-status\.md/);
  assert.match(checklist, /release:handoff/);
  assert.match(checklist, /summary\.status=passed/);
  assert.match(checklist, /summary\.productionReady=true/);
  assert.match(checklist, /R2\/CDN: passed/);
  assert.match(checklist, /Admin static app: passed/);
  assert.match(checklist, /Publish flow: passed/);
  assert.match(checklist, /COMMERCE_ENABLED=false/);
  assert.match(checklist, /MULTI_LOCALE_ENABLED=false/);
  assert.match(checklist, /allow_blocked_release_notes/);
  assert.match(checklist, /failure review draft/);
  assert.match(checklist, /--all-visual-tasks/);
  assert.match(checklist, /visual-reference-import-report\.md/);
  assert.match(checklist, /\.\.\/\.\.\/infra\/README\.md/);
});

test("infra runbook covers production smoke deployment and rollback", async () => {
  const runbook = await readFile(infraReadmePath, "utf8");

  for (const pattern of [
    /apps\/web`: Vercel/,
    /apps\/admin`: static hosting/,
    /services\/api`: independent Node\.js service/,
    /managed PostgreSQL/,
    /managed Redis over TLS/,
    /Cloudflare R2 private bucket plus public CDN origin/,
    /COMMERCE_ENABLED=false/,
    /MULTI_LOCALE_ENABLED=false/,
    /Production Environment Matrix/,
    /prisma migrate deploy --schema prisma\/schema\.prisma/,
    /pnpm --filter @app-starter\/api run prisma:seed/,
    /pnpm --filter @app-starter\/admin build/,
    /page-builder-visual-fixture-<run_number>/,
    /pnpm visual:acceptance -- --require-accepted/,
    /Production Smoke/,
    /require_admin_app=true/,
    /require_r2_upload=true/,
    /require_revalidation=true/,
    /production-smoke-report-<run_number>/,
    /release-evidence-check-<run_number>/,
    /project-status-<run_number>/,
    /pnpm smoke:release-check -- artifacts\/production-smoke\/smoke-report\.json/,
    /pnpm release:handoff -- --require-ready/,
    /pnpm release:notes -- --release-tag/,
    /rollback_target/,
    /Do not run\s+destructive database rollbacks/,
    /Page rollback API or Admin rollback action/,
  ]) {
    assert.match(runbook, pattern);
  }
});

test("infra runbook maps production environment sources", async () => {
  const [runbook, workflow] = await Promise.all([
    readFile(infraReadmePath, "utf8"),
    readFile(workflowPath, "utf8"),
  ]);
  const documentedMatrix = parseProductionEnvironmentMatrix(runbook);
  const workflowEnvironment = parseProductionSmokeWorkflowEnvironment(workflow);
  const workflowRuntimeVariables = [...workflowEnvironment.keys()]
    .filter(shouldDocumentRuntimeEnvironmentVariable)
    .sort();

  assert.deepEqual(
    [...documentedMatrix.keys()].sort(),
    workflowRuntimeVariables,
  );

  for (const variable of workflowRuntimeVariables) {
    assert.equal(
      documentedMatrix.get(variable),
      workflowEnvironment.get(variable),
      `${variable} source must match the Production Smoke workflow env block.`,
    );
  }

  for (const pattern of [
    /\| `API_URL` \| `\$\{\{ secrets\.PRODUCTION_API_URL \}\}` \|/,
    /\| `WEB_URL` \| `\$\{\{ secrets\.PRODUCTION_WEB_URL \}\}` \|/,
    /\| `ADMIN_URL` \| `\$\{\{ secrets\.PRODUCTION_ADMIN_URL \}\}` \|/,
    /\| `DATABASE_URL` \| `\$\{\{ secrets\.PRODUCTION_DATABASE_URL \}\}` \|/,
    /\| `REDIS_URL` \| `\$\{\{ secrets\.PRODUCTION_REDIS_URL \}\}` \|/,
    /\| `JWT_PRIVATE_KEY` \| `\$\{\{ secrets\.PRODUCTION_JWT_PRIVATE_KEY \}\}` \|/,
    /\| `JWT_PUBLIC_KEY` \| `\$\{\{ secrets\.PRODUCTION_JWT_PUBLIC_KEY \}\}` \|/,
    /\| `PREVIEW_TOKEN_SECRET` \| `\$\{\{ secrets\.PRODUCTION_PREVIEW_TOKEN_SECRET \}\}` \|/,
    /\| `STOREFRONT_REVALIDATE_SECRET` \| `\$\{\{ secrets\.PRODUCTION_STOREFRONT_REVALIDATE_SECRET \}\}` \|/,
    /\| `STOREFRONT_REVALIDATE_URL` \| `\$\{\{ secrets\.PRODUCTION_STOREFRONT_REVALIDATE_URL \}\}` \|/,
    /\| `R2_SECRET_ACCESS_KEY` \| `\$\{\{ secrets\.PRODUCTION_R2_SECRET_ACCESS_KEY \}\}` \|/,
    /\| `MEDIA_CDN_BASE_URL` \| `\$\{\{ vars\.PRODUCTION_MEDIA_CDN_BASE_URL \}\}` \|/,
    /\| `ANALYTICS_ENABLED` \| `\$\{\{ vars\.PRODUCTION_ANALYTICS_ENABLED \}\}` \|/,
    /\| `COMMERCE_ENABLED` \| `"false"` \|/,
    /\| `MULTI_LOCALE_ENABLED` \| `"false"` \|/,
    /\| `STRIPE_SECRET_KEY` \| `\$\{\{ secrets\.PRODUCTION_STRIPE_SECRET_KEY \}\}` \|/,
    /\| `SMOKE_ADMIN_EMAIL` \| `\$\{\{ secrets\.PRODUCTION_SMOKE_ADMIN_EMAIL \}\}` \|/,
    /\| `SMOKE_REQUIRE_R2_UPLOAD` \| `\$\{\{ inputs\.require_r2_upload \}\}` \|/,
    /\| `SMOKE_STOREFRONT_HOST` \| `\$\{\{ inputs\.storefront_host \}\}` \|/,
    /\| `SMOKE_REPORT_PATH` \| `\$\{\{ inputs\.report_path \}\}` \|/,
    /set `VITE_API_URL` and `VITE_WEB_URL` at Admin build time/,
  ]) {
    assert.match(runbook, pattern);
  }
});

test("main CI verifies the smoke report CLI entry point", async () => {
  const workflow = await readFile(ciWorkflowPath, "utf8");

  assert.match(workflow, /pnpm smoke:report -- --help/);
  assert.match(workflow, /pnpm smoke:release-check -- --help/);
  assert.match(workflow, /pnpm release:check -- --help/);
  assert.match(workflow, /pnpm release:handoff -- --help/);
  assert.match(workflow, /pnpm release:preflight -- --help/);
  assert.match(
    workflow,
    /pnpm project:status -- --all-actions --markdown-output tmp\/project-status-handoff\.md/,
  );
  assert.match(workflow, /pnpm visual:artifact-check -- --help/);
});

function matchCount(value, pattern) {
  return [...value.matchAll(pattern)].length;
}
