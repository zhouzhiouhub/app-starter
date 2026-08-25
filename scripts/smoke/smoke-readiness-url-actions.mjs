export function readDeploymentAction(blocker) {
  if (blocker.issue === "admin-smoke-not-required") {
    return "Set ADMIN_URL to the deployed Admin HTTPS origin and SMOKE_REQUIRE_ADMIN_APP=true so smoke verifies the Admin shell, module script, modulepreload chunks, and stylesheet assets from the same origin.";
  }

  const variable = blocker.variable ?? readDeploymentVariable(blocker.area);
  const label = readDeploymentLabel(blocker.area);
  const fallback = readDeploymentFallback(blocker.area, variable);

  return readCommonUrlAction(blocker.issue, {
    fallback,
    controlCharacter:
      `Remove control characters from ${variable} before rerunning production smoke.`,
    localHost:
      `Replace local or private ${variable} hosts with the deployed public HTTPS ${label}.`,
    placeholderHost:
      `Replace placeholder ${variable} hosts with the real production ${label}.`,
    unsupportedPath: readDeploymentPathAction(blocker.area, variable),
    unsupportedProtocol:
      `Use an https:// ${variable}; deployment URLs cannot use non-HTTP protocols.`,
    insecureProtocol:
      `Use https:// for ${variable}; production deployment URLs cannot use http://.`,
    invalidUrl: `Set ${variable} to a valid production HTTPS URL.`,
    embeddedCredentials: `Remove usernames and passwords from ${variable}.`,
    unsupportedUrlParts: `Remove query strings and fragments from ${variable}.`,
    missingHost: `Include a production hostname in ${variable}.`,
  });
}

export function readDatabaseUrlAction(blocker) {
  return readCommonUrlAction(blocker.issue, {
    fallback:
      "Set DATABASE_URL to a production PostgreSQL connection URL outside local or placeholder hosts.",
    localHost:
      "Replace local or private DATABASE_URL hosts with a managed production PostgreSQL hostname.",
    placeholderHost:
      "Replace placeholder DATABASE_URL hosts with the real managed PostgreSQL hostname.",
    unsupportedProtocol:
      "Use postgres:// or postgresql:// for DATABASE_URL.",
    invalidUrl:
      "Fix DATABASE_URL so it parses as a PostgreSQL connection URL.",
    missingHost: "Include a production PostgreSQL hostname in DATABASE_URL.",
  });
}

export function readRedisAction(blocker) {
  return readCommonUrlAction(blocker.issue, {
    fallback:
      "Set REDIS_URL to a production rediss:// Redis endpoint outside local or placeholder hosts.",
    localHost:
      "Replace local or private REDIS_URL hosts with a managed production Redis hostname.",
    placeholderHost:
      "Replace placeholder REDIS_URL hosts with the real managed Redis hostname.",
    unsupportedProtocol:
      "Use redis:// or rediss:// for REDIS_URL; production readiness requires rediss://.",
    insecureProtocol:
      "Use rediss:// for REDIS_URL; production Redis must use TLS.",
    invalidUrl: "Fix REDIS_URL so it parses as a Redis connection URL.",
    missingHost: "Include a production Redis hostname in REDIS_URL.",
  });
}

export function readRevalidationUrlAction(blocker) {
  return readCommonUrlAction(blocker.issue, {
    fallback:
      "Set STOREFRONT_REVALIDATE_URL to the deployed storefront /api/revalidate endpoint.",
    controlCharacter:
      "Remove control characters from STOREFRONT_REVALIDATE_URL or WEB_URL before rerunning production smoke.",
    localHost:
      "Replace local or private STOREFRONT_REVALIDATE_URL hosts with the deployed storefront HTTPS host.",
    placeholderHost:
      "Replace placeholder STOREFRONT_REVALIDATE_URL hosts with the real storefront HTTPS host.",
    unsupportedProtocol:
      "Use an https:// STOREFRONT_REVALIDATE_URL; revalidation URLs cannot use non-HTTP protocols.",
    insecureProtocol:
      "Use https:// for STOREFRONT_REVALIDATE_URL; production revalidation cannot use http://.",
    invalidUrl:
      "Set STOREFRONT_REVALIDATE_URL to a valid production HTTPS URL.",
    embeddedCredentials:
      "Remove usernames and passwords from STOREFRONT_REVALIDATE_URL.",
    unsupportedUrlParts:
      "Remove query strings and fragments from STOREFRONT_REVALIDATE_URL.",
    unsupportedPath:
      "Set STOREFRONT_REVALIDATE_URL to the deployed storefront origin or exact /api/revalidate endpoint.",
    missingHost:
      "Include the deployed storefront hostname in STOREFRONT_REVALIDATE_URL.",
  });
}

function readCommonUrlAction(issue, actions) {
  if (issue === "control-character") {
    return actions.controlCharacter ?? actions.invalidUrl ?? actions.fallback;
  }

  if (issue === "invalid-url") {
    return actions.invalidUrl;
  }

  if (issue === "unsupported-protocol") {
    return actions.unsupportedProtocol;
  }

  if (issue === "embedded-credentials") {
    return actions.embeddedCredentials;
  }

  if (issue === "unsupported-url-parts") {
    return actions.unsupportedUrlParts;
  }

  if (issue === "unexpected-path") {
    return actions.unsupportedPath;
  }

  if (issue === "missing-host") {
    return actions.missingHost;
  }

  if (issue === "local-host") {
    return actions.localHost;
  }

  if (issue === "placeholder-host") {
    return actions.placeholderHost;
  }

  if (issue === "insecure-protocol") {
    return actions.insecureProtocol;
  }

  return actions.fallback;
}

function readDeploymentVariable(area) {
  if (area === "deployment.api") {
    return "API_URL";
  }

  if (area === "deployment.web") {
    return "WEB_URL";
  }

  return "ADMIN_URL";
}

function readDeploymentLabel(area) {
  if (area === "deployment.api") {
    return "API endpoint";
  }

  if (area === "deployment.web") {
    return "storefront origin";
  }

  return "Admin origin";
}

function readDeploymentFallback(area, variable) {
  if (area === "deployment.api") {
    return `Set ${variable} to the deployed API HTTPS origin or exact /api/v1 base.`;
  }

  if (area === "deployment.web") {
    return `Set ${variable} to the deployed storefront HTTPS origin.`;
  }

  return `Set ${variable} to the deployed Admin HTTPS origin, then rerun with SMOKE_REQUIRE_ADMIN_APP=true.`;
}

function readDeploymentPathAction(area, variable) {
  if (area === "deployment.api") {
    return `Set ${variable} to the deployed API origin or exact /api/v1 base; remove any other path.`;
  }

  return `Set ${variable} to the deployed origin only; remove path segments.`;
}
