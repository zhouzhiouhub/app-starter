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

test("smoke readiness blocks non-production revalidation URLs", () => {
  const environment = createReadyEnvironment();
  environment.revalidation.urlSafe = false;
  environment.revalidation.urlIssue = "local-host";

  const readiness = createSmokeProductionReadiness(
    environment,
    createReadyConfig(),
  );

  assert.deepEqual(readiness.blockers, [
    {
      area: "revalidation.url",
      issue: "local-host",
      message: "Storefront revalidation URL must be a production HTTPS endpoint.",
    },
  ]);
  assert.equal(readiness.productionReady, false);
  assert.deepEqual(readiness.nextActions, [
    {
      action:
        "Set STOREFRONT_REVALIDATE_URL to the deployed storefront /api/revalidate endpoint.",
      area: "revalidation.url",
    },
  ]);
});

test("smoke readiness blocks unsafe revalidation secrets", () => {
  const environment = createReadyEnvironment();
  environment.revalidation.secretConfigured = true;
  environment.revalidation.secretIssue = "control-character";
  environment.revalidation.secretSafe = false;

  const readiness = createSmokeProductionReadiness(
    environment,
    createReadyConfig(),
  );

  assert.deepEqual(readiness.blockers, [
    {
      area: "revalidation.secret",
      issue: "control-character",
      message:
        "STOREFRONT_REVALIDATE_SECRET must be a safe bounded value before production smoke.",
      variable: "STOREFRONT_REVALIDATE_SECRET",
    },
  ]);
  assert.equal(readiness.productionReady, false);
  assert.deepEqual(readiness.nextActions, [
    {
      action:
        "Set STOREFRONT_REVALIDATE_SECRET in both API and Web runtimes.",
      area: "revalidation.secret",
    },
  ]);
});
