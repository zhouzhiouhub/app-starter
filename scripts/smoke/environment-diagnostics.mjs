const defaultMediaCdnBaseUrl = "https://cdn.local.invalid";
const r2RequiredVariables = [
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET",
];

export function createSmokeEnvironmentDiagnostics(env = process.env) {
  const mediaCdnBaseUrl = readEnv(env, "MEDIA_CDN_BASE_URL");
  const legacyCdnBaseUrl = readEnv(env, "CDN_BASE_URL");
  const cdnHost = readUrlHost(
    mediaCdnBaseUrl ?? legacyCdnBaseUrl ?? defaultMediaCdnBaseUrl,
  );
  const missingR2Variables = r2RequiredVariables.filter(
    (name) => !readEnv(env, name),
  );

  return {
    media: {
      cdnConfigured: Boolean(mediaCdnBaseUrl ?? legacyCdnBaseUrl),
      cdnHost,
      cdnUsesLocalFallback: Boolean(cdnHost?.endsWith(".local.invalid")),
      externalUrlHosts: readHostList(readEnv(env, "MEDIA_EXTERNAL_URL_HOSTS")),
      r2: {
        configured: missingR2Variables.length === 0,
        missingRequired: missingR2Variables,
        region: readEnv(env, "R2_REGION") ?? "auto",
      },
    },
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
