import {
  isLocalHostname,
  isPlaceholderHostname,
} from "./cdn-hostname.mjs";

const defaultAdminUrl = "http://localhost:5173";
const defaultApiUrl = "http://localhost:4000";
const defaultWebUrl = "http://localhost:3000";

export function createDeploymentDiagnostics(env = process.env, options = {}) {
  return {
    admin: readDeploymentUrlDiagnostics({
      configuredValue: readEnv(env, "ADMIN_URL"),
      defaultValue: defaultAdminUrl,
      effectiveValue: options.adminUrl,
      name: "ADMIN_URL",
      pathPolicy: "origin",
    }),
    api: readDeploymentUrlDiagnostics({
      configuredValue: readEnv(env, "API_URL"),
      defaultValue: defaultApiUrl,
      effectiveValue: options.apiBaseUrl,
      name: "API_URL",
      pathPolicy: "api-base",
    }),
    web: readDeploymentUrlDiagnostics({
      configuredValue: readEnv(env, "WEB_URL"),
      defaultValue: defaultWebUrl,
      effectiveValue: options.webUrl,
      name: "WEB_URL",
      pathPolicy: "origin",
    }),
  };
}

function readDeploymentUrlDiagnostics(input) {
  const value = input.effectiveValue ?? input.configuredValue ?? input.defaultValue;
  const parsed = readDeploymentUrl(value, input.pathPolicy);

  return {
    configured: Boolean(input.configuredValue),
    host: parsed.host,
    path: parsed.path,
    productionReady: parsed.issue === null,
    urlIssue: parsed.issue,
    urlSafe: parsed.issue === null,
    variable: input.name,
  };
}

function readDeploymentUrl(value, pathPolicy) {
  let url;

  try {
    url = new URL(value);
  } catch {
    return {
      host: null,
      issue: "invalid-url",
      path: null,
    };
  }

  const host = url.hostname || null;
  const path = trimTrailingSlashes(url.pathname);
  const pathIssue = readPathIssue(path, pathPolicy);

  if (!["http:", "https:"].includes(url.protocol)) {
    return { host, issue: "unsupported-protocol", path };
  }

  if (url.username || url.password) {
    return { host, issue: "embedded-credentials", path };
  }

  if (url.search || url.hash) {
    return { host, issue: "unsupported-url-parts", path };
  }

  if (pathIssue) {
    return { host, issue: pathIssue, path };
  }

  if (isLocalHostname(url.hostname)) {
    return { host, issue: "local-host", path };
  }

  if (isPlaceholderHostname(url.hostname)) {
    return { host, issue: "placeholder-host", path };
  }

  if (url.protocol !== "https:") {
    return { host, issue: "insecure-protocol", path };
  }

  return { host, issue: null, path };
}

function readPathIssue(path, pathPolicy) {
  if (pathPolicy === "api-base") {
    return path === "" || path === "/api/v1" ? null : "unexpected-path";
  }

  return path === "" ? null : "unexpected-path";
}

function trimTrailingSlashes(pathname) {
  return pathname.replace(/\/+$/, "");
}

function readEnv(env, name) {
  const value = env[name]?.trim();
  return value ? value : null;
}
