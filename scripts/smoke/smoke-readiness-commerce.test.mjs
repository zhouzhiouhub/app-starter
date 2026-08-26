import assert from "node:assert/strict";
import test from "node:test";
import { createSmokeProductionReadiness } from "./smoke-readiness.mjs";
import {
  createReadyConfig,
  createReadyEnvironment,
} from "./smoke-readiness-test-fixtures.mjs";

test("smoke readiness accepts missing Stripe secrets while Commerce is disabled", () => {
  const environment = createReadyEnvironment();
  environment.commerce = {
    stripe: {
      configured: false,
      productionReady: true,
      secretKey: {
        configured: false,
        issue: null,
        safe: true,
        variable: "STRIPE_SECRET_KEY",
      },
      webhookSecret: {
        configured: false,
        issue: null,
        safe: true,
        variable: "STRIPE_WEBHOOK_SECRET",
      },
    },
  };

  const readiness = createSmokeProductionReadiness(
    environment,
    createReadyConfig(),
  );

  assert.equal(readiness.productionReady, true);
  assert.deepEqual(readiness.blockers, []);
});

test("smoke readiness blocks unsafe configured Stripe secrets", () => {
  const environment = createReadyEnvironment();
  environment.commerce = {
    stripe: {
      configured: true,
      productionReady: false,
      secretKey: {
        configured: true,
        issue: "test-key",
        safe: false,
        variable: "STRIPE_SECRET_KEY",
      },
      webhookSecret: {
        configured: true,
        issue: "placeholder-secret",
        safe: false,
        variable: "STRIPE_WEBHOOK_SECRET",
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
      ["commerce.stripe.secret-key", "test-key", "STRIPE_SECRET_KEY"],
      [
        "commerce.stripe.webhook-secret",
        "placeholder-secret",
        "STRIPE_WEBHOOK_SECRET",
      ],
    ],
  );
  assert.equal(readiness.productionReady, false);
  assert.deepEqual(readiness.nextActions, [
    {
      action:
        "Remove STRIPE_SECRET_KEY from the MVP production runtime or replace it with a live Stripe value only when Phase 2 commerce is explicitly enabled.",
      area: "commerce.stripe.secret-key",
    },
    {
      action:
        "Replace placeholder STRIPE_WEBHOOK_SECRET values with an empty value for MVP or a production Stripe secret during Phase 2 setup.",
      area: "commerce.stripe.webhook-secret",
    },
  ]);
});

test("smoke readiness stays compatible with reports without Stripe diagnostics", () => {
  const environment = createReadyEnvironment();
  delete environment.commerce;

  const readiness = createSmokeProductionReadiness(
    environment,
    createReadyConfig(),
  );

  assert.equal(readiness.productionReady, true);
  assert.deepEqual(readiness.blockers, []);
});
