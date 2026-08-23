const analyticsProviderRules = {
  CLARITY_PROJECT_ID: {
    maxLength: 64,
    pattern: /^[a-z0-9]+$/i,
  },
  GA4_MEASUREMENT_ID: {
    maxLength: 64,
    pattern: /^G-[A-Z0-9]+$/i,
  },
  GTM_CONTAINER_ID: {
    maxLength: 64,
    pattern: /^GTM-[A-Z0-9]+$/i,
  },
};

export function createAnalyticsDiagnostics(env = process.env) {
  const enabled = readBooleanDiagnostic(env, "ANALYTICS_ENABLED");
  const consent = readBooleanDiagnostic(env, "ANALYTICS_CONSENT_GRANTED");
  const providers = Object.fromEntries(
    Object.entries(analyticsProviderRules).map(([name, rule]) => [
      name,
      readProviderDiagnostic(env, name, rule),
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

function readProviderDiagnostic(env, name, rule) {
  const value = env[name]?.trim();
  const configured = Boolean(value);

  return {
    configured,
    valid: configured ? isValidProviderId(value, rule) : false,
  };
}

function isValidProviderId(value, rule) {
  return value.length <= rule.maxLength && rule.pattern.test(value);
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
