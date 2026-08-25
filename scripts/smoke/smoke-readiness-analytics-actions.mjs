const booleanValues = "true/false, 1/0, yes/no, or on/off";

const providerFormats = {
  CLARITY_PROJECT_ID: "Clarity project ID using letters or numbers only",
  GA4_MEASUREMENT_ID: "GA4 measurement ID such as G-XXXXXXXXXX",
  GTM_CONTAINER_ID: "GTM container ID such as GTM-XXXXXXX",
};

export function readAnalyticsEnabledAction(blocker) {
  if (blocker.issue === "invalid-boolean") {
    return `Set ANALYTICS_ENABLED to a boolean value (${booleanValues}).`;
  }

  return "Set ANALYTICS_ENABLED to true or false.";
}

export function readAnalyticsConsentAction(blocker) {
  if (blocker.issue === "invalid-boolean") {
    return `Set ANALYTICS_CONSENT_GRANTED to a boolean value (${booleanValues}).`;
  }

  if (blocker.issue === "missing-consent") {
    return "Keep ANALYTICS_CONSENT_GRANTED=false until a consent mechanism or CMP grants analytics consent.";
  }

  return "Set ANALYTICS_CONSENT_GRANTED to true or false.";
}

export function readAnalyticsProviderAction(blocker) {
  if (blocker.issue === "invalid-provider" && blocker.variable) {
    return `Fix ${blocker.variable} to match ${readProviderFormat(blocker.variable)}, or remove it and disable analytics.`;
  }

  if (blocker.issue === "missing-provider") {
    return "Configure at least one analytics provider ID: GTM_CONTAINER_ID, GA4_MEASUREMENT_ID, or CLARITY_PROJECT_ID; otherwise set ANALYTICS_ENABLED=false.";
  }

  return "Set a valid GTM_CONTAINER_ID, GA4_MEASUREMENT_ID, or CLARITY_PROJECT_ID, or set ANALYTICS_ENABLED=false.";
}

function readProviderFormat(variable) {
  return providerFormats[variable] ?? "the documented analytics provider format";
}
