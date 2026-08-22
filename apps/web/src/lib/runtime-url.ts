import { isProductionHttpUrl } from "@app-starter/schema";

const defaultApiBaseUrl = "http://localhost:4000/api/v1";
const defaultWebOrigin = "http://localhost:3000";

export class WebRuntimeUrlConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WebRuntimeUrlConfigurationError";
  }
}

export function getApiBaseUrl(): string {
  return resolveApiBaseUrl({
    configuredUrl: process.env.API_URL,
    deploymentEnv: readDeploymentEnv(),
    internalUrl: process.env.API_INTERNAL_URL,
    publicUrl: process.env.NEXT_PUBLIC_API_URL,
  });
}

export function resolveApiBaseUrl(input: {
  configuredUrl?: string;
  deploymentEnv?: string;
  internalUrl?: string;
  publicUrl?: string;
}): string {
  const requireProductionUrl = isProductionDeployment(input.deploymentEnv);
  const resolved =
    readHttpBaseUrl(input.internalUrl, requireProductionUrl) ??
    readHttpBaseUrl(input.configuredUrl, requireProductionUrl) ??
    readHttpBaseUrl(input.publicUrl, requireProductionUrl);

  if (resolved) {
    return resolved;
  }

  if (isProductionDeployment(input.deploymentEnv)) {
    throw new WebRuntimeUrlConfigurationError(
      "API_URL or NEXT_PUBLIC_API_URL must be configured as a safe API URL in production.",
    );
  }

  return defaultApiBaseUrl;
}

export function resolveWebOrigin(input: {
  deploymentEnv?: string;
  publicWebUrl?: string;
  webUrl?: string;
}): string {
  const requireProductionUrl = isProductionDeployment(input.deploymentEnv);
  const resolved =
    readHttpOrigin(input.webUrl, requireProductionUrl) ??
    readHttpOrigin(input.publicWebUrl, requireProductionUrl);

  if (resolved) {
    return resolved;
  }

  if (isProductionDeployment(input.deploymentEnv)) {
    throw new WebRuntimeUrlConfigurationError(
      "WEB_URL or NEXT_PUBLIC_WEB_URL must be configured as a safe Web origin in production.",
    );
  }

  return defaultWebOrigin;
}

function readHttpBaseUrl(
  value: string | undefined,
  requireProductionUrl = false,
): string | null {
  const url = readSafeHttpUrl(value, requireProductionUrl);

  if (!url) {
    return null;
  }

  const pathname = normalizeApiBasePath(url.pathname);
  return pathname ? `${url.origin}${pathname}` : null;
}

function readHttpOrigin(
  value: string | undefined,
  requireProductionUrl = false,
): string | null {
  const url = readSafeHttpUrl(value, requireProductionUrl);

  if (!url || trimTrailingSlashes(url.pathname) !== "/") {
    return null;
  }

  return url.origin;
}

function readSafeHttpUrl(
  value: string | undefined,
  requireProductionUrl: boolean,
): URL | null {
  const trimmed = value?.trim();

  if (!trimmed) {
    return null;
  }

  try {
    const url = new URL(trimmed);

    if (
      !isHttpProtocol(url.protocol) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      (requireProductionUrl && !isProductionHttpUrl(url))
    ) {
      return null;
    }

    return url;
  } catch {
    return null;
  }
}

function trimTrailingSlashes(value: string): string {
  const trimmed = value.replace(/\/+$/, "");
  return trimmed || "/";
}

function normalizeApiBasePath(value: string): string | null {
  const pathname = trimTrailingSlashes(value);

  if (pathname === "/") {
    return "/api/v1";
  }

  return pathname === "/api/v1" ? pathname : null;
}

function isHttpProtocol(protocol: string): boolean {
  return protocol === "http:" || protocol === "https:";
}

function isProductionDeployment(value: string | undefined): boolean {
  return value?.trim().toLowerCase() === "production";
}

function readDeploymentEnv(): string | undefined {
  return process.env.VERCEL_ENV ?? process.env.APP_ENV;
}
