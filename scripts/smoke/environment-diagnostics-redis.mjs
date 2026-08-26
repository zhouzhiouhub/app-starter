import {
  isLocalHostname,
  isPlaceholderHostname,
} from "./cdn-hostname.mjs";

export function createRedisDiagnostics(env = process.env) {
  const value = readEnv(env, "REDIS_URL");
  const configured = Boolean(value);
  const hasControlCharacters = value ? hasControlCharacter(value) : false;
  const hasSurroundingWhitespace = value ? value.trim() !== value : false;
  const url =
    value && !hasControlCharacters && !hasSurroundingWhitespace
      ? readRedisUrl(value)
      : null;
  const urlIssue = readRedisUrlIssue({
    configured,
    hasControlCharacters,
    hasSurroundingWhitespace,
    url,
  });

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

  if (input.hasControlCharacters) {
    return "control-character";
  }

  if (input.hasSurroundingWhitespace) {
    return "surrounding-whitespace";
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
  const value = env[name];
  return typeof value === "string" && value.trim() ? value : null;
}

function hasControlCharacter(value) {
  return Array.from(value).some((character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    return codePoint <= 0x1f || codePoint === 0x7f;
  });
}
