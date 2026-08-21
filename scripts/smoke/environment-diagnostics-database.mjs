import {
  isLocalHostname,
  isPlaceholderHostname,
} from "./cdn-hostname.mjs";

export function createDatabaseDiagnostics(env = process.env) {
  const value = readEnv(env, "DATABASE_URL");
  const configured = Boolean(value);
  const url = value ? readDatabaseUrl(value) : null;
  const urlIssue = readDatabaseUrlIssue({ configured, url });

  return {
    configured,
    host: url?.hostname ?? null,
    productionReady: configured && urlIssue === null,
    urlIssue,
    urlSafe: configured && urlIssue === null,
    variable: "DATABASE_URL",
  };
}

function readDatabaseUrlIssue(input) {
  if (!input.configured) {
    return "missing-url";
  }

  if (!input.url) {
    return "invalid-url";
  }

  if (!["postgres:", "postgresql:"].includes(input.url.protocol)) {
    return "unsupported-protocol";
  }

  if (isLocalHostname(input.url.hostname)) {
    return "local-host";
  }

  if (isPlaceholderHostname(input.url.hostname)) {
    return "placeholder-host";
  }

  return null;
}

function readDatabaseUrl(value) {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function readEnv(env, name) {
  const value = env[name]?.trim();
  return value ? value : null;
}
