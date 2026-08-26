import { appendBlocker } from "./smoke-readiness-blockers.mjs";

export function collectCommerceReadiness(blockers, commerce) {
  const stripe = commerce?.stripe;

  if (!stripe || typeof stripe !== "object" || Array.isArray(stripe)) {
    return;
  }

  if (stripe.productionReady === true) {
    return;
  }

  appendOptionalStripeSecretBlocker(blockers, stripe.secretKey, {
    area: "commerce.stripe.secret-key",
    variable: "STRIPE_SECRET_KEY",
  });
  appendOptionalStripeSecretBlocker(blockers, stripe.webhookSecret, {
    area: "commerce.stripe.webhook-secret",
    variable: "STRIPE_WEBHOOK_SECRET",
  });
}

function appendOptionalStripeSecretBlocker(blockers, diagnostic, input) {
  if (diagnostic?.safe === true) {
    return;
  }

  appendBlocker(
    blockers,
    input.area,
    diagnostic?.issue ?? "invalid-format",
    `${input.variable} is optional in MVP, but configured values must be production-safe.`,
    { variable: input.variable },
  );
}
