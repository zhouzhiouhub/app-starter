import {
  isLocalHostname,
  isPlaceholderHostname,
} from "./cdn-hostname.mjs";

const defaultRevalidatePath = "/api/revalidate";
const maxRevalidationSecretLength = 1024;

export function createRevalidationDiagnostics(env = process.env, options = {}) {
  const revalidateUrl = readEnv(env, "STOREFRONT_REVALIDATE_URL");
  const webUrl = readEnv(env, "WEB_URL");
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
  const value = readEnv(env, "STOREFRONT_REVALIDATE_SECRET");

  if (!value) {
    return {
      configured: false,
      issue: "missing-secret",
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

  if (hasControlCharacter(value)) {
    return {
      configured: true,
      issue: "control-character",
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

  if (["1", "true", "yes", "on"].includes(value)) {
    return true;
  }

  if (["0", "false", "no", "off"].includes(value)) {
    return false;
  }

  throw new Error(`${name} must be true or false.`);
}

function readEnv(env, name) {
  const value = env[name]?.trim();
  return value ? value : null;
}

function hasControlCharacter(value) {
  return Array.from(value).some((character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    return codePoint <= 0x1f || codePoint === 0x7f;
  });
}
