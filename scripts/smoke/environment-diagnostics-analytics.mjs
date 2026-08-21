const analyticsProviderPatterns = {
  CLARITY_PROJECT_ID: /^[a-z0-9]+$/i,
  GA4_MEASUREMENT_ID: /^G-[A-Z0-9]+$/i,
  GTM_CONTAINER_ID: /^GTM-[A-Z0-9]+$/i,
};

export function createAnalyticsDiagnostics(env = process.env) {
  const enabled = readBooleanDiagnostic(env, "ANALYTICS_ENABLED");
  const consent = readBooleanDiagnostic(env, "ANALYTICS_CONSENT_GRANTED");
  const providers = Object.fromEntries(
    Object.entries(analyticsProviderPatterns).map(([name, pattern]) => [
      name,
      readProviderDiagnostic(env, name, pattern),
    ]),
  );
  const invalidProviders = Object.entries(providers)
    .filter(([, provider]) => provider.configured && !provider.valid)
    .map(([name]) => name);
  const providerConfigured = Object.values(providers).some(
    (provider) => provider.valid,
  );

  return {
    consent,
    enabled,
    invalidProviders,
    productionReady:
      enabled.productionReady &&
      consent.productionReady &&
      (enabled.value !== true ||
        (consent.value === true &&
          providerConfigured &&
          invalidProviders.length === 0)),
    providerConfigured,
    providers,
  };
}

function readBooleanDiagnostic(env, name) {
  const raw = env[name]?.trim();

  if (!raw) {
    return {
      configured: false,
      issue: null,
      productionReady: true,
      value: false,
    };
  }

  const value = readBooleanValue(raw);

  return {
    configured: true,
    issue: value === null ? "invalid-boolean" : null,
    productionReady: value !== null,
    value,
  };
}

function readProviderDiagnostic(env, name, pattern) {
  const value = env[name]?.trim();
  const configured = Boolean(value);

  return {
    configured,
    valid: configured ? pattern.test(value) : false,
  };
}

function readBooleanValue(value) {
  const normalized = value.toLowerCase();

  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }

  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }

  return null;
}
