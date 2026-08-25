const booleanValues = "true/false, 1/0, yes/no, or on/off";

const featureFlagReasons = {
  COMMERCE_ENABLED:
    "MVP must not enable checkout, payment, or order creation flows.",
  MULTI_LOCALE_ENABLED:
    "MVP must not publish non-default Locale content.",
};

export function readFeatureFlagAction(blocker) {
  const variable = blocker.variable;

  if (!variable) {
    return "Set COMMERCE_ENABLED=false and MULTI_LOCALE_ENABLED=false explicitly in the API runtime before production smoke.";
  }

  if (blocker.issue === "missing-env") {
    return `Set ${variable}=false explicitly in the API runtime; production smoke blocks missing MVP feature flag values.`;
  }

  if (blocker.issue === "invalid-boolean") {
    return `Set ${variable}=false using a valid boolean value (${booleanValues}).`;
  }

  if (blocker.issue === "enabled") {
    return `Set ${variable}=false in the API runtime before production smoke; ${readFeatureFlagReason(variable)}`;
  }

  return `Set ${variable}=false in the API runtime before production smoke.`;
}

function readFeatureFlagReason(variable) {
  return featureFlagReasons[variable] ?? "MVP feature flags must remain disabled.";
}
