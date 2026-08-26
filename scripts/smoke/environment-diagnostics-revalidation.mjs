import {
  isLocalHostname,
  isPlaceholderHostname,
} from "./cdn-hostname.mjs";

const defaultRevalidatePath = "/api/revalidate";
const maxRevalidationSecretLength = 1024;

export function createRevalidationDiagnostics(env = process.env, options = {}) {
  const revalidateUrl = readUrlEnv(env, "STOREFRONT_REVALIDATE_URL");
  const webUrl = readUrlEnv(env, "WEB_URL");
  const source = revalidateUrl
    ? "STOREFRONT_REVALIDATE_URL"
    : webUrl
      ? "WEB_URL"
      : null;
  const endpoint = readRevalidationEndpoint(revalidateUrl ?? webUrl, source);
  const secret = readRevalidationSecret(env);

  return {
    configured: secret.safe && endpoint.safe,
    endpointHost: endpoint.host,
    endpointPath: endpoint.path,
    requireRevalidation:
      typeof options.requireRevalidation === "boolean"
        ? options.requireRevalidation
        : readBooleanEnv(env, "SMOKE_REQUIRE_REVALIDATION", true),
    secretConfigured: secret.configured,
    secretIssue: secret.issue,
    secretSafe: secret.safe,
    urlConfigured: Boolean(source),
    urlIssue: endpoint.issue,
    urlSafe: endpoint.safe,
    urlSource: source,
    usesWebUrlFallback: source === "WEB_URL",
  };
}

function readRevalidationSecret(env) {
  const value = readSecretEnv(env, "STOREFRONT_REVALIDATE_SECRET");

  if (!value) {
    return {
      configured: false,
      issue: "missing-secret",
      safe: false,
    };
  }

  if (hasControlCharacter(value)) {
    return {
      configured: true,
      issue: "control-character",
      safe: false,
    };
  }

  if (value.trim() !== value) {
    return {
      configured: true,
      issue: "surrounding-whitespace",
      safe: false,
    };
  }

  if (value.length > maxRevalidationSecretLength) {
    return {
      configured: true,
      issue: "oversized-secret",
      safe: false,
    };
  }

  return {
    configured: true,
    issue: null,
    safe: true,
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

  if (hasControlCharacter(value)) {
    return {
      host: null,
      issue: "control-character",
      path: null,
      safe: false,
    };
  }

  const trimmed = value.trim();
  let url;
  try {
    url = new URL(trimmed);
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

  if (isLocalHostname(url.hostname)) {
    return {
      host: url.hostname,
      issue: "local-host",
      path: null,
      safe: false,
    };
  }

  if (isPlaceholderHostname(url.hostname)) {
    return {
      host: url.hostname,
      issue: "placeholder-host",
      path: null,
      safe: false,
    };
  }

  if (url.protocol !== "https:") {
    return {
      host: url.hostname,
      issue: "insecure-protocol",
      path: null,
      safe: false,
    };
  }

  if (
    source !== "WEB_URL" &&
    !isSupportedRevalidatePath(url.pathname)
  ) {
    return {
      host: url.hostname,
      issue: "unexpected-path",
      path: createRevalidateEndpointPath(url.pathname),
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

function isSupportedRevalidatePath(pathname) {
  const normalized = createRevalidateEndpointPath(pathname);
  return normalized === defaultRevalidatePath;
}

function readBooleanEnv(env, name, fallback) {
  const value = env[name]?.trim().toLowerCase();

  if (!value) {
    return fallback;
  }

  if (["1", "true", "yes", "on"].includes(value)) {
    return true;
  }

  if (["0", "false", "no", "off"].includes(value)) {
    return false;
  }

  throw new Error(`${name} must be true or false.`);
}

function readSecretEnv(env, name) {
  const value = env[name];

  if (typeof value !== "string" || value.length === 0) {
    return null;
  }

  if (hasControlCharacter(value)) {
    return value;
  }

  return value.trim().length > 0 ? value : null;
}

function readUrlEnv(env, name) {
  const value = env[name];
  return typeof value === "string" && value.trim() ? value : null;
}

function hasControlCharacter(value) {
  return Array.from(value).some((character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    return codePoint <= 0x1f || codePoint === 0x7f;
  });
}
