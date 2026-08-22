export function appendBlocker(blockers, area, issue, message, extra = {}) {
  blockers.push({
    area,
    issue,
    message,
    ...extra,
  });
}

export function appendDisabledFeatureFlagBlocker(blockers, flags, input) {
  const flag = flags[input.name];

  if (flag?.productionReady === true) {
    return;
  }

  appendBlocker(
    blockers,
    input.area,
    flag?.issue ?? "missing-env",
    `${input.name} must be explicitly set to false before production smoke.`,
    { variable: input.name },
  );
}

export function appendJwtKeyBlocker(blockers, input) {
  if (input.diagnostic?.valid === true) {
    return;
  }

  appendBlocker(
    blockers,
    input.area,
    input.diagnostic?.issue ?? "missing-key",
    `${input.variable} must be configured as a valid PEM key before production smoke.`,
    { variable: input.variable },
  );
}

export function appendUrlBlocker(blockers, area, diagnostics) {
  if (diagnostics?.productionReady === true) {
    return;
  }

  appendBlocker(
    blockers,
    area,
    diagnostics?.urlIssue ?? "missing-url",
    `${diagnostics?.variable ?? area} must be a production HTTPS URL.`,
    {
      host: diagnostics?.host ?? null,
      path: diagnostics?.path ?? null,
      variable: diagnostics?.variable ?? null,
    },
  );
}
