import assert from "node:assert/strict";
import test from "node:test";
import {
  createProductionSmokeDispatchCommand,
  productionSmokeDispatchInputs,
} from "./production-smoke-dispatch-command.mjs";

test("production smoke dispatch command names workflow and release inputs", () => {
  const command = createProductionSmokeDispatchCommand();

  assert.match(
    command,
    /^gh workflow run production-smoke\.yml --ref main /,
  );
  assert.match(
    command,
    /-f visual_artifact_name="page-builder-visual-fixture-<run_number>"/,
  );
  assert.match(
    command,
    /-f visual_artifact_run_id="<Page Builder Visual workflow run id>"/,
  );
  assert.match(command, /-f release_tag="<tag>"/);
  assert.match(
    command,
    /-f storefront_url="<public HTTPS storefront URL>"/,
  );
  assert.equal(productionSmokeDispatchInputs.length, 7);
  assert.ok(command.length <= 420);
});

test("production smoke dispatch command accepts scoped overrides", () => {
  assert.equal(
    createProductionSmokeDispatchCommand({
      inputs: [{ name: "release_tag", value: 'release "candidate"' }],
      ref: "release/mvp",
      workflowFile: "production-smoke.yml",
    }),
    'gh workflow run production-smoke.yml --ref release/mvp -f release_tag="release \\"candidate\\""',
  );
});
