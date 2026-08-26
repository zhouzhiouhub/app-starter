export function readStripeSecretAction(blocker) {
  const variable = blocker.variable ?? "STRIPE_SECRET_KEY";

  if (blocker.issue === "test-key") {
    return `Remove ${variable} from the MVP production runtime or replace it with a live Stripe value only when Phase 2 commerce is explicitly enabled.`;
  }

  if (blocker.issue === "placeholder-secret") {
    return `Replace placeholder ${variable} values with an empty value for MVP or a production Stripe secret during Phase 2 setup.`;
  }

  if (blocker.issue === "surrounding-whitespace") {
    return `Remove leading and trailing whitespace from ${variable}.`;
  }

  if (blocker.issue === "control-character") {
    return `Remove control characters from ${variable}.`;
  }

  return `Use a valid production Stripe format for ${variable}, or leave it unset while Commerce remains disabled in MVP.`;
}
