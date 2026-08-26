import assert from "node:assert/strict";
import test from "node:test";
import { createSmokeEnvironmentDiagnostics } from "./environment-diagnostics.mjs";

test("smoke environment diagnostics treats Stripe secrets as optional in MVP", () => {
  const diagnostics = createSmokeEnvironmentDiagnostics({});

  assert.deepEqual(diagnostics.commerce.stripe, {
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
  });
});

test("smoke environment diagnostics accepts production Stripe secret formats", () => {
  const diagnostics = createSmokeEnvironmentDiagnostics({
    STRIPE_SECRET_KEY: "sk_live_secretKeyValue",
    STRIPE_WEBHOOK_SECRET: "whsec_webhookSecretValue",
  });

  assert.deepEqual(diagnostics.commerce.stripe, {
    configured: true,
    productionReady: true,
    secretKey: {
      configured: true,
      issue: null,
      safe: true,
      variable: "STRIPE_SECRET_KEY",
    },
    webhookSecret: {
      configured: true,
      issue: null,
      safe: true,
      variable: "STRIPE_WEBHOOK_SECRET",
    },
  });

  const serialized = JSON.stringify(diagnostics.commerce);
  assert.equal(serialized.includes("secretKeyValue"), false);
  assert.equal(serialized.includes("webhookSecretValue"), false);
});

test("smoke environment diagnostics rejects unsafe Stripe secret values", () => {
  const diagnostics = createSmokeEnvironmentDiagnostics({
    STRIPE_SECRET_KEY: "sk_test_secretKeyValue",
    STRIPE_WEBHOOK_SECRET: " whsec_webhookSecretValue",
  });

  assert.equal(diagnostics.commerce.stripe.productionReady, false);
  assert.deepEqual(diagnostics.commerce.stripe.secretKey, {
    configured: true,
    issue: "test-key",
    safe: false,
    variable: "STRIPE_SECRET_KEY",
  });
  assert.deepEqual(diagnostics.commerce.stripe.webhookSecret, {
    configured: true,
    issue: "surrounding-whitespace",
    safe: false,
    variable: "STRIPE_WEBHOOK_SECRET",
  });
});

test("smoke environment diagnostics rejects placeholder Stripe values", () => {
  const diagnostics = createSmokeEnvironmentDiagnostics({
    STRIPE_SECRET_KEY: "sk_live_changeme",
    STRIPE_WEBHOOK_SECRET: "whsec_example",
  });

  assert.equal(diagnostics.commerce.stripe.productionReady, false);
  assert.equal(
    diagnostics.commerce.stripe.secretKey.issue,
    "placeholder-secret",
  );
  assert.equal(
    diagnostics.commerce.stripe.webhookSecret.issue,
    "placeholder-secret",
  );
});

test("smoke environment diagnostics rejects malformed Stripe values", () => {
  const diagnostics = createSmokeEnvironmentDiagnostics({
    STRIPE_SECRET_KEY: "pk_live_publishableKey",
    STRIPE_WEBHOOK_SECRET: "whsec_webhookSecretValue\r",
  });

  assert.equal(diagnostics.commerce.stripe.productionReady, false);
  assert.equal(diagnostics.commerce.stripe.secretKey.issue, "invalid-format");
  assert.equal(
    diagnostics.commerce.stripe.webhookSecret.issue,
    "control-character",
  );
});
