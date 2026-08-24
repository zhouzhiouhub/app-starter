import assert from "node:assert/strict";
import test from "node:test";
import { createSmokeProductionReadiness } from "./smoke-readiness.mjs";
import {
  createReadyConfig,
  createReadyEnvironment,
} from "./smoke-readiness-test-fixtures.mjs";

test("smoke readiness requires production JWT keys", () => {
  const environment = createReadyEnvironment();
  environment.identity = {
    jwt: {
      privateKey: {
        issue: "invalid-pem",
        valid: false,
      },
      productionReady: false,
      publicKey: {
        valid: false,
      },
    },
  };
  const readiness = createSmokeProductionReadiness(
    environment,
    createReadyConfig(),
  );

  assert.deepEqual(
    readiness.blockers.map((blocker) => [
      blocker.area,
      blocker.issue,
      blocker.variable,
    ]),
    [
      ["identity.jwt.private", "invalid-pem", "JWT_PRIVATE_KEY"],
      ["identity.jwt.public", "missing-key", "JWT_PUBLIC_KEY"],
    ],
  );
  assert.equal(readiness.productionReady, false);
  assert.deepEqual(readiness.nextActions, [
    {
      action:
        "Set JWT_PRIVATE_KEY to a production PEM key in the API runtime.",
      area: "identity.jwt.private",
    },
    {
      action:
        "Set JWT_PUBLIC_KEY to a production PEM key in the API runtime.",
      area: "identity.jwt.public",
    },
  ]);
});

test("smoke readiness blocks mismatched JWT key pairs", () => {
  const environment = createReadyEnvironment();
  environment.identity = {
    jwt: {
      pair: {
        checked: true,
        issue: "mismatched-key-pair",
        valid: false,
      },
      privateKey: {
        valid: true,
      },
      productionReady: false,
      publicKey: {
        valid: true,
      },
    },
  };
  const readiness = createSmokeProductionReadiness(
    environment,
    createReadyConfig(),
  );

  assert.deepEqual(readiness.blockers, [
    {
      area: "identity.jwt.pair",
      issue: "mismatched-key-pair",
      message:
        "JWT_PRIVATE_KEY and JWT_PUBLIC_KEY must be a valid matching RS256 key pair.",
    },
  ]);
  assert.equal(readiness.productionReady, false);
  assert.deepEqual(readiness.nextActions, [
    {
      action:
        "Replace JWT_PRIVATE_KEY and JWT_PUBLIC_KEY with a matching RS256 PEM key pair in the API runtime.",
      area: "identity.jwt.pair",
    },
  ]);
});
