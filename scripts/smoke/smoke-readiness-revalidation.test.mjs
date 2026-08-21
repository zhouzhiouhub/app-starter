import assert from "node:assert/strict";
import test from "node:test";
import { createSmokeProductionReadiness } from "./smoke-readiness.mjs";
import {
  createReadyConfig,
  createReadyEnvironment,
} from "./smoke-readiness-test-fixtures.mjs";

test("smoke readiness warns when revalidation uses WEB_URL fallback", () => {
  const environment = createReadyEnvironment();
  environment.revalidation.usesWebUrlFallback = true;

  const readiness = createSmokeProductionReadiness(
    environment,
    createReadyConfig(),
  );

  assert.deepEqual(readiness.warnings, [
    {
      area: "revalidation.url",
      issue: "uses-web-url-fallback",
      message:
        "STOREFRONT_REVALIDATE_URL is not set; smoke will derive /api/revalidate from WEB_URL.",
    },
  ]);
  assert.equal(readiness.productionReady, true);
  assert.deepEqual(readiness.nextActions, [
    {
      action:
        "Optionally set STOREFRONT_REVALIDATE_URL explicitly instead of relying on WEB_URL fallback.",
      area: "revalidation.url",
    },
  ]);
});
