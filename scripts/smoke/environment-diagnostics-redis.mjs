import {
  isLocalHostname,
  isPlaceholderHostname,
} from "./cdn-hostname.mjs";

export function createRedisDiagnostics(env = process.env) {
  const value = readEnv(env, "REDIS_URL");
  const configured = Boolean(value);
  const url = value ? readRedisUrl(value) : null;
  const urlIssue = readRedisUrlIssue({ configured, url });

  return {
    configured,
    host: url?.hostname ?? null,
    productionReady: configured && urlIssue === null,
    urlIssue,
    urlSafe: configured && urlIssue === null,
    usesTls: url?.protocol === "rediss:",
    variable: "REDIS_URL",
  };
}

function readRedisUrlIssue(input) {
  if (!input.configured) {
    return "missing-url";
  }

  if (!input.url) {
    return "invalid-url";
  }

  if (!["redis:", "rediss:"].includes(input.url.protocol)) {
    return "unsupported-protocol";
  }

  if (!input.url.hostname) {
    return "missing-host";
  }

  if (isLocalHostname(input.url.hostname)) {
    return "local-host";
  }

  if (isPlaceholderHostname(input.url.hostname)) {
    return "placeholder-host";
  }

  if (input.url.protocol !== "rediss:") {
    return "insecure-protocol";
  }

  return null;
}

function readRedisUrl(value) {
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
