const defaultMediaCdnBaseUrl = "https://cdn.local.invalid";
const defaultRevalidatePath = "/api/revalidate";
const r2RequiredVariables = [
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET",
];

export function createSmokeEnvironmentDiagnostics(
  env = process.env,
  options = {},
) {
  const mediaCdnBaseUrl = readEnv(env, "MEDIA_CDN_BASE_URL");
  const legacyCdnBaseUrl = readEnv(env, "CDN_BASE_URL");
  const cdnConfigured = Boolean(mediaCdnBaseUrl ?? legacyCdnBaseUrl);
  const cdn = readCdnDiagnostics(
    mediaCdnBaseUrl ?? legacyCdnBaseUrl ?? defaultMediaCdnBaseUrl,
  );
  const missingR2Variables = r2RequiredVariables.filter(
    (name) => !readEnv(env, name),
  );

  return {
    media: {
      cdnConfigured,
      cdnHost: cdn.host,
      cdnProductionReady: cdn.productionReady,
      cdnUrlIssue: cdn.issue,
      cdnUrlSafe: cdn.safe,
      cdnUsesLocalFallback: cdn.localHost,
      externalUrlHosts: readHostList(readEnv(env, "MEDIA_EXTERNAL_URL_HOSTS")),
      r2: {
        configured: missingR2Variables.length === 0,
        missingRequired: missingR2Variables,
        region: readEnv(env, "R2_REGION") ?? "auto",
      },
    },
    revalidation: readRevalidationDiagnostics(env, options),
  };
}

function readEnv(env, name) {
  const value = env[name]?.trim();
  return value ? value : null;
}

function readHostList(value) {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((item) => readHostFromUrlOrHostname(item.trim()))
    .filter(Boolean);
}

function readHostFromUrlOrHostname(value) {
  if (!value) {
    return null;
  }

  if (value.includes("://")) {
    return readUrlHost(value);
  }

  return value.toLowerCase();
}

function readUrlHost(value) {
  if (!value) {
    return null;
  }

  try {
    return new URL(value).hostname;
  } catch {
    return null;
  }
}

function readCdnDiagnostics(value) {
  let url;

  try {
    url = new URL(value);
  } catch {
    return {
      host: null,
      issue: "invalid-url",
      localHost: false,
      productionReady: false,
      safe: false,
    };
  }

  const host = url.hostname || null;

  if (url.protocol !== "https:") {
    return {
      host,
      issue: "unsupported-protocol",
      localHost: isLocalHostname(url.hostname),
      productionReady: false,
      safe: false,
    };
  }

  if (url.username || url.password) {
    return {
      host,
      issue: "embedded-credentials",
      localHost: isLocalHostname(url.hostname),
      productionReady: false,
      safe: false,
    };
  }

  if (url.search || url.hash) {
    return {
      host,
      issue: "unsupported-url-parts",
      localHost: isLocalHostname(url.hostname),
      productionReady: false,
      safe: false,
    };
  }

  const localHost = isLocalHostname(url.hostname);

  return {
    host,
    issue: localHost ? "local-host" : null,
    localHost,
    productionReady: !localHost,
    safe: !localHost,
  };
}

function readRevalidationDiagnostics(env, options) {
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

function isLocalHostname(hostname) {
  const normalized = hostname.toLowerCase();

  return (
    normalized === "localhost" ||
    normalized.endsWith(".localhost") ||
    normalized.endsWith(".local") ||
    normalized.endsWith(".local.invalid") ||
    normalized === "::1" ||
    normalized === "[::1]" ||
    isPrivateOrLocalIpv4(normalized)
  );
}

function isPrivateOrLocalIpv4(hostname) {
  const parts = hostname.split(".").map((part) => Number(part));

  if (
    parts.length !== 4 ||
    parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)
  ) {
    return false;
  }

  const [first, second] = parts;

  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168)
  );
}
