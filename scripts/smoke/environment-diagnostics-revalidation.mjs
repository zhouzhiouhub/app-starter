const defaultRevalidatePath = "/api/revalidate";

export function createRevalidationDiagnostics(env = process.env, options = {}) {
  const revalidateUrl = readEnv(env, "STOREFRONT_REVALIDATE_URL");
  const webUrl = readEnv(env, "WEB_URL");
  const source = revalidateUrl
    ? "STOREFRONT_REVALIDATE_URL"
    : webUrl
      ? "WEB_URL"
      : null;
  const endpoint = readRevalidationEndpoint(revalidateUrl ?? webUrl, source);

  return {
    configured:
      Boolean(readEnv(env, "STOREFRONT_REVALIDATE_SECRET")) && endpoint.safe,
    endpointHost: endpoint.host,
    endpointPath: endpoint.path,
    requireRevalidation:
      typeof options.requireRevalidation === "boolean"
        ? options.requireRevalidation
        : readBooleanEnv(env, "SMOKE_REQUIRE_REVALIDATION", true),
    secretConfigured: Boolean(readEnv(env, "STOREFRONT_REVALIDATE_SECRET")),
    urlConfigured: Boolean(source),
    urlIssue: endpoint.issue,
    urlSafe: endpoint.safe,
    urlSource: source,
    usesWebUrlFallback: source === "WEB_URL",
  };
}

function readRevalidationEndpoint(value, source) {
  if (!value) {
    return {
      host: null,
      issue: "missing-url",
      path: null,
      safe: false,
    };
  }

  let url;
  try {
    url = new URL(value);
  } catch {
    return {
      host: null,
      issue: "invalid-url",
      path: null,
      safe: false,
    };
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    return {
      host: url.hostname || null,
      issue: "unsupported-protocol",
      path: null,
      safe: false,
    };
  }

  if (url.username || url.password) {
    return {
      host: url.hostname,
      issue: "embedded-credentials",
      path: null,
      safe: false,
    };
  }

  if (url.search || url.hash) {
    return {
      host: url.hostname,
      issue: "unsupported-url-parts",
      path: null,
      safe: false,
    };
  }

  return {
    host: url.hostname,
    issue: null,
    path:
      source === "WEB_URL"
        ? defaultRevalidatePath
        : createRevalidateEndpointPath(url.pathname),
    safe: true,
  };
}

function createRevalidateEndpointPath(pathname) {
  const trimmed = pathname.replace(/\/+$/, "");

  return trimmed ? trimmed : defaultRevalidatePath;
}

function readBooleanEnv(env, name, fallback) {
  const value = env[name]?.trim().toLowerCase();

  if (!value) {
    return fallback;
  }

  return ["1", "true", "yes", "on"].includes(value);
}

function readEnv(env, name) {
  const value = env[name]?.trim();
  return value ? value : null;
}
