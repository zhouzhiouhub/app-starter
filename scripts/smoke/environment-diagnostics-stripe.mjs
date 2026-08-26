const stripeSecretKeyPrefixes = ["sk_live_", "rk_live_"];
const stripeTestKeyPrefixes = ["sk_test_", "rk_test_"];
const stripeWebhookSecretPrefix = "whsec_";
const placeholderTokens = [
  "changeme",
  "example",
  "placeholder",
  "replace_me",
  "your_",
];

export function createStripeDiagnostics(env = process.env) {
  const secretKey = readOptionalStripeSecret(env, {
    livePrefixes: stripeSecretKeyPrefixes,
    name: "STRIPE_SECRET_KEY",
    testPrefixes: stripeTestKeyPrefixes,
  });
  const webhookSecret = readOptionalStripeSecret(env, {
    livePrefixes: [stripeWebhookSecretPrefix],
    name: "STRIPE_WEBHOOK_SECRET",
    testPrefixes: [],
  });

  return {
    configured: secretKey.configured || webhookSecret.configured,
    productionReady: secretKey.safe && webhookSecret.safe,
    secretKey,
    webhookSecret,
  };
}

function readOptionalStripeSecret(env, input) {
  const value = env[input.name];

  if (!hasConfiguredValue(value)) {
    return {
      configured: false,
      issue: null,
      safe: true,
      variable: input.name,
    };
  }

  const issue = readStripeSecretIssue(value, input);

  return {
    configured: true,
    issue,
    safe: issue === null,
    variable: input.name,
  };
}

function readStripeSecretIssue(value, input) {
  if (hasControlCharacter(value)) {
    return "control-character";
  }

  if (value.trim() !== value) {
    return "surrounding-whitespace";
  }

  const normalized = value.toLowerCase();

  if (placeholderTokens.some((token) => normalized.includes(token))) {
    return "placeholder-secret";
  }

  if (input.testPrefixes.some((prefix) => value.startsWith(prefix))) {
    return "test-key";
  }

  if (!input.livePrefixes.some((prefix) => value.startsWith(prefix))) {
    return "invalid-format";
  }

  return null;
}

function hasConfiguredValue(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function hasControlCharacter(value) {
  return Array.from(value).some((character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    return codePoint <= 0x1f || codePoint === 0x7f;
  });
}
