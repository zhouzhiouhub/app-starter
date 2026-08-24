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
  const r2 = readR2Diagnostics(env);

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
      configured: r2.missingRequired.length === 0 && r2.issues.length === 0,
      issues: r2.issues,
      missingRequired: r2.missingRequired,
      region: r2.region,
    },
  };
}

function readR2Diagnostics(env) {
  const accountId = readEnv(env, "R2_ACCOUNT_ID");
  const accessKeyId = readEnv(env, "R2_ACCESS_KEY_ID");
  const bucket = readEnv(env, "R2_BUCKET");
  const region = readEnv(env, "R2_REGION");
  const secretAccessKey = readEnv(env, "R2_SECRET_ACCESS_KEY");
  const missingRequired = r2RequiredVariables.filter((name) => !readEnv(env, name));
  const issues = [];

  appendR2Issue(issues, "R2_ACCOUNT_ID", accountId, isSafeR2AccountId);
  appendR2Issue(issues, "R2_ACCESS_KEY_ID", accessKeyId, isSafeR2Credential);
  appendR2Issue(issues, "R2_BUCKET", bucket, isSafeR2Bucket);
  appendR2Issue(
    issues,
    "R2_SECRET_ACCESS_KEY",
    secretAccessKey,
    isSafeR2Credential,
  );

  if (region && !isSafeR2Region(region)) {
    issues.push({
      issue: "invalid-region",
      variable: "R2_REGION",
    });
  }

  return {
    issues,
    missingRequired,
    region: region && isSafeR2Region(region) ? region : "auto",
  };
}

function appendR2Issue(issues, variable, value, isSafe) {
  if (!value) {
    return;
  }

  if (!isSafe(value)) {
    issues.push({
      issue: readR2Issue(variable),
      variable,
    });
  }
}

function readR2Issue(variable) {
  if (variable === "R2_ACCOUNT_ID") {
    return "invalid-account-id";
  }

  if (variable === "R2_BUCKET") {
    return "invalid-bucket";
  }

  return "invalid-credential";
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

function isSafeR2AccountId(value) {
  return (
    value.length <= 63 &&
    /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(value)
  );
}

function isSafeR2Bucket(value) {
  return (
    value.length >= 3 &&
    value.length <= 63 &&
    /^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/i.test(value) &&
    !value.includes("..")
  );
}

function isSafeR2Credential(value) {
  return (
    value.length <= 4096 &&
    !/\s/.test(value) &&
    !hasControlCharacter(value)
  );
}

function isSafeR2Region(value) {
  return (
    value.length <= 64 &&
    /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(value)
  );
}

function hasControlCharacter(value) {
  return Array.from(value).some((character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    return codePoint <= 0x1f || codePoint === 0x7f;
  });
}
