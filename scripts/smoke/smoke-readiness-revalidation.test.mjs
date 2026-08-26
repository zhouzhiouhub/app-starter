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
        "Optionally set STOREFRONT_REVALIDATE_URL to the deployed storefront /api/revalidate endpoint so API revalidation does not rely on WEB_URL fallback.",
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
        "Replace local or private STOREFRONT_REVALIDATE_URL hosts with the deployed storefront HTTPS host.",
      area: "revalidation.url",
    },
  ]);
});

test("smoke readiness explains unexpected revalidation paths", () => {
  const environment = createReadyEnvironment();
  environment.revalidation.urlSafe = false;
  environment.revalidation.urlIssue = "unexpected-path";

  const readiness = createSmokeProductionReadiness(
    environment,
    createReadyConfig(),
  );

  assert.deepEqual(readiness.blockers, [
    {
      area: "revalidation.url",
      issue: "unexpected-path",
      message: "Storefront revalidation URL must be a production HTTPS endpoint.",
    },
  ]);
  assert.equal(readiness.productionReady, false);
  assert.deepEqual(readiness.nextActions, [
    {
      action:
        "Set STOREFRONT_REVALIDATE_URL to the deployed storefront origin or exact /api/revalidate endpoint.",
      area: "revalidation.url",
    },
  ]);
});

test("smoke readiness explains control characters in revalidation URLs", () => {
  const environment = createReadyEnvironment();
  environment.revalidation.urlSafe = false;
  environment.revalidation.urlIssue = "control-character";

  const readiness = createSmokeProductionReadiness(
    environment,
    createReadyConfig(),
  );

  assert.deepEqual(readiness.blockers, [
    {
      area: "revalidation.url",
      issue: "control-character",
      message: "Storefront revalidation URL must be a production HTTPS endpoint.",
    },
  ]);
  assert.equal(readiness.productionReady, false);
  assert.deepEqual(readiness.nextActions, [
    {
      action:
        "Remove control characters from STOREFRONT_REVALIDATE_URL or WEB_URL before rerunning production smoke.",
      area: "revalidation.url",
    },
  ]);
});

test("smoke readiness explains revalidation URLs with surrounding whitespace", () => {
  const environment = createReadyEnvironment();
  environment.revalidation.urlSafe = false;
  environment.revalidation.urlIssue = "surrounding-whitespace";

  const readiness = createSmokeProductionReadiness(
    environment,
    createReadyConfig(),
  );

  assert.deepEqual(readiness.nextActions, [
    {
      action:
        "Remove leading and trailing whitespace from STOREFRONT_REVALIDATE_URL or WEB_URL before rerunning production smoke.",
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
        "Set STOREFRONT_REVALIDATE_SECRET in both API and Web runtimes without control characters.",
      area: "revalidation.secret",
    },
  ]);
});

test("smoke readiness explains revalidation secrets with surrounding whitespace", () => {
  const environment = createReadyEnvironment();
  environment.revalidation.secretConfigured = true;
  environment.revalidation.secretIssue = "surrounding-whitespace";
  environment.revalidation.secretSafe = false;

  const readiness = createSmokeProductionReadiness(
    environment,
    createReadyConfig(),
  );

  assert.deepEqual(readiness.blockers, [
    {
      area: "revalidation.secret",
      issue: "surrounding-whitespace",
      message:
        "STOREFRONT_REVALIDATE_SECRET must be a safe bounded value before production smoke.",
      variable: "STOREFRONT_REVALIDATE_SECRET",
    },
  ]);
  assert.equal(readiness.productionReady, false);
  assert.deepEqual(readiness.nextActions, [
    {
      action:
        "Remove leading and trailing whitespace from STOREFRONT_REVALIDATE_SECRET in both API and Web runtimes.",
      area: "revalidation.secret",
    },
  ]);
});
