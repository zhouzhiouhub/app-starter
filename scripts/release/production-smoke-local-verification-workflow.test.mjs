import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const workflowPath = ".github/workflows/production-smoke.yml";

test("production smoke workflow passes local verification evidence to release notes", async () => {
  const workflow = await readFile(workflowPath, "utf8");

  assert.match(workflow, /local_verification_run_url:/);
  assert.match(workflow, /local_verification_artifact_name:/);
  assert.match(
    workflow,
    /RELEASE_LOCAL_VERIFICATION_RUN_URL: \$\{\{ inputs\.local_verification_run_url \}\}/,
  );
  assert.match(
    workflow,
    /RELEASE_LOCAL_VERIFICATION_ARTIFACT_NAME: \$\{\{ inputs\.local_verification_artifact_name \}\}/,
  );
  assert.match(
    workflow,
    /--local-verification-run-url "\$RELEASE_LOCAL_VERIFICATION_RUN_URL"/,
  );
  assert.match(
    workflow,
    /--local-verification-artifact "\$RELEASE_LOCAL_VERIFICATION_ARTIFACT_NAME"/,
  );
  assert.match(workflow, /Local verification artifact/);
});
