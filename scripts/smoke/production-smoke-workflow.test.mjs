import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const workflowPath = ".github/workflows/production-smoke.yml";
const ciWorkflowPath = ".github/workflows/ci.yml";
const checklistPath = "docs/development/release-checklist.md";

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
  assert.match(workflow, /storefront_url:/);
  assert.match(workflow, /release_notes_path:/);
  assert.match(workflow, /default: "artifacts\/release\/release-notes\.md"/);
  assert.match(workflow, /SMOKE_REPORT_PATH: \$\{\{ inputs\.report_path \}\}/);
  assert.match(workflow, /SMOKE_REQUIRE_ADMIN_APP:/);
  assert.match(workflow, /SMOKE_REQUIRE_R2_UPLOAD:/);
  assert.match(workflow, /SMOKE_REQUIRE_REVALIDATION:/);
  assert.match(workflow, /APP_ENV: production/);
  assert.match(workflow, /pnpm smoke:publish/);
  assert.match(workflow, /if: always\(\)/);
  assert.match(workflow, /pnpm smoke:report -- "\$SMOKE_REPORT_PATH"/);
  assert.match(workflow, /pnpm smoke:release-check -- "\$SMOKE_REPORT_PATH"/);
  assert.match(workflow, /RELEASE_CHECK_ARTIFACT_PATH:/);
  assert.match(workflow, /RELEASE_CHECK_ARTIFACT_NAME:/);
  assert.match(workflow, /RELEASE_NOTES_ARTIFACT_NAME:/);
  assert.match(workflow, /RELEASE_NOTES_PATH: \$\{\{ inputs\.release_notes_path \}\}/);
  assert.match(
    workflow,
    /pnpm release:check -- --checklist --smoke-report "\$SMOKE_REPORT_PATH" --output "\$RELEASE_CHECK_ARTIFACT_PATH"/,
  );
  assert.match(workflow, /name: Generate release notes/);
  assert.match(
    workflow,
    /inputs\.release_tag != '' && inputs\.rollback_target != '' && inputs\.visual_artifact_name != ''/,
  );
  assert.match(workflow, /pnpm release:notes --/);
  assert.match(workflow, /--release-tag "\$RELEASE_TAG"/);
  assert.match(workflow, /--workflow-run-url "https:\/\/github\.com\/\$\{\{ github\.repository \}\}\/actions\/runs\/\$\{\{ github\.run_id \}\}"/);
  assert.match(workflow, /--release-check "\$RELEASE_CHECK_ARTIFACT_PATH"/);
  assert.match(workflow, /GITHUB_STEP_SUMMARY/);
  assert.match(workflow, /Release gate:/);
  assert.match(workflow, /Combined gate:/);
  assert.match(workflow, /release:check -- --checklist/);
  assert.match(workflow, /Combined artifact:/);
  assert.match(workflow, /Release notes:/);
  assert.match(workflow, /Release notes artifact:/);
  assert.match(workflow, /skipped \(set release_tag, rollback_target, and visual_artifact_name\)/);
  assert.match(workflow, /SMOKE_REPORT_ARTIFACT_NAME:/);
  assert.match(workflow, /actions\/upload-artifact@v4/);
  assert.match(workflow, /path: \$\{\{ inputs\.report_path \}\}/);
  assert.match(workflow, /path: \$\{\{ env\.RELEASE_CHECK_ARTIFACT_PATH \}\}/);
  assert.match(workflow, /path: \$\{\{ env\.RELEASE_NOTES_PATH \}\}/);
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
  assert.match(checklist, /summary\.status=passed/);
  assert.match(checklist, /summary\.productionReady=true/);
  assert.match(checklist, /R2\/CDN: passed/);
  assert.match(checklist, /Admin static app: passed/);
  assert.match(checklist, /Publish flow: passed/);
  assert.match(checklist, /COMMERCE_ENABLED=false/);
  assert.match(checklist, /MULTI_LOCALE_ENABLED=false/);
});

test("main CI verifies the smoke report CLI entry point", async () => {
  const workflow = await readFile(ciWorkflowPath, "utf8");

  assert.match(workflow, /pnpm smoke:report -- --help/);
  assert.match(workflow, /pnpm smoke:release-check -- --help/);
  assert.match(workflow, /pnpm release:check -- --help/);
});
