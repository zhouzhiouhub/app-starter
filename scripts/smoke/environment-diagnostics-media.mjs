import {
  isLocalHostname,
  isPlaceholderHostname,
} from "./cdn-hostname.mjs";

const defaultMediaCdnBaseUrl = "https://cdn.local.invalid";
const r2RequiredVariables = [
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET",
];

export function createMediaDiagnostics(env = process.env) {
  const mediaCdnBaseUrl = readEnv(env, "MEDIA_CDN_BASE_URL");
  const cdnConfigured = Boolean(mediaCdnBaseUrl);
  const cdn = readCdnDiagnostics(
    mediaCdnBaseUrl ?? defaultMediaCdnBaseUrl,
  );
  const externalUrlHosts = readExternalUrlHostDiagnostics(
    readEnv(env, "MEDIA_EXTERNAL_URL_HOSTS"),
  );
  const missingR2Variables = r2RequiredVariables.filter(
    (name) => !readEnv(env, name),
  );

  return {
    cdnConfigured,
    cdnHost: cdn.host,
    cdnProductionReady: cdn.productionReady,
    cdnUrlIssue: cdn.issue,
    cdnUrlSafe: cdn.safe,
    cdnUsesLocalFallback: cdn.localHost,
    externalUrlHostIssues: externalUrlHosts
      .filter((host) => host.issue)
      .map(({ host, issue }) => ({ host, issue })),
    externalUrlHosts: externalUrlHosts
      .filter((host) => !host.issue)
      .map(({ host }) => host),
    externalUrlHostsProductionReady: externalUrlHosts.every(
      (host) => !host.issue,
    ),
    r2: {
      configured: missingR2Variables.length === 0,
      missingRequired: missingR2Variables,
      region: readEnv(env, "R2_REGION") ?? "auto",
    },
  };
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
  const placeholderHost = isPlaceholderHostname(url.hostname);

  return {
    host,
    issue: localHost
      ? "local-host"
      : placeholderHost
        ? "placeholder-host"
        : null,
    localHost,
    productionReady: !localHost && !placeholderHost,
    safe: !localHost && !placeholderHost,
  };
}

function readExternalUrlHostDiagnostics(value) {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((item) => readExternalUrlHost(item.trim()))
    .filter(Boolean);
}

function readExternalUrlHost(value) {
  if (!value) {
    return null;
  }

  if (value.includes("://")) {
    return readExternalUrlHostFromUrl(value);
  }

  return readExternalUrlHostFromHostname(value);
}

function readExternalUrlHostFromUrl(value) {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase() || null;

    if (url.protocol !== "https:") {
      return { host, issue: "unsupported-protocol" };
    }

    if (url.username || url.password) {
      return { host, issue: "embedded-credentials" };
    }

    if (url.pathname.replace(/\/+$/, "") || url.search || url.hash) {
      return { host, issue: "unsupported-url-parts" };
    }

    return readProductionHostSafety(host);
  } catch {
    return { host: null, issue: "invalid-url" };
  }
}

function readExternalUrlHostFromHostname(value) {
  if (/[/?#\\@]/.test(value)) {
    return readInvalidHostnameDiagnostic(value);
  }

  try {
    const url = new URL(`https://${value}`);
    return readProductionHostSafety(url.hostname.toLowerCase() || null);
  } catch {
    return { host: null, issue: "invalid-host" };
  }
}

function readInvalidHostnameDiagnostic(value) {
  try {
    const url = new URL(`https://${value}`);
    return {
      host: url.hostname.toLowerCase() || null,
      issue: "unsupported-url-parts",
    };
  } catch {
    return { host: null, issue: "invalid-host" };
  }
}

function readProductionHostSafety(host) {
  if (!host) {
    return { host: null, issue: "invalid-host" };
  }

  if (isLocalHostname(host)) {
    return { host, issue: "local-host" };
  }

  if (isPlaceholderHostname(host)) {
    return { host, issue: "placeholder-host" };
  }

  return { host, issue: null };
}

function readEnv(env, name) {
  const value = env[name]?.trim();
  return value ? value : null;
}
