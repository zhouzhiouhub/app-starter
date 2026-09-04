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
    nextPhase: process.env.NEXT_PHASE,
    publicUrl: process.env.NEXT_PUBLIC_API_URL,
  });
}

export function resolveApiBaseUrl(input: {
  configuredUrl?: string;
  deploymentEnv?: string;
  internalUrl?: string;
  nextPhase?: string;
  publicUrl?: string;
}): string {
  const requireProductionUrl = shouldRequireProductionUrl(
    input.deploymentEnv,
    input.nextPhase,
  );
  const resolved =
    readHttpBaseUrl(input.internalUrl, requireProductionUrl) ??
    readHttpBaseUrl(input.configuredUrl, requireProductionUrl) ??
    readHttpBaseUrl(input.publicUrl, requireProductionUrl);

  if (resolved) {
    return resolved;
  }

  if (requireProductionUrl) {
    throw new WebRuntimeUrlConfigurationError(
      "API_URL or NEXT_PUBLIC_API_URL must be configured as a safe API URL in production.",
    );
  }

  return defaultApiBaseUrl;
}

export function resolveWebOrigin(input: {
  deploymentEnv?: string;
  nextPhase?: string;
  publicWebUrl?: string;
  vercelUrl?: string;
  webUrl?: string;
}): string {
  const requireProductionUrl = shouldRequireProductionUrl(
    input.deploymentEnv,
    input.nextPhase,
  );
  const resolved =
    readHttpOrigin(input.webUrl, requireProductionUrl) ??
    readHttpOrigin(input.publicWebUrl, requireProductionUrl) ??
    readVercelDeploymentOrigin(input.vercelUrl, requireProductionUrl);

  if (resolved) {
    return resolved;
  }

  if (requireProductionUrl) {
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

  if (requireProductionUrl && trimmed !== value) {
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

function readVercelDeploymentOrigin(
  vercelUrl: string | undefined,
  requireProductionUrl: boolean,
): string | null {
  const host = vercelUrl?.trim();

  if (!host) {
    return null;
  }

  const origin = host.includes("://") ? host : `https://${host}`;
  return readHttpOrigin(origin, requireProductionUrl);
}

function shouldRequireProductionUrl(
  deploymentEnv: string | undefined,
  nextPhase: string | undefined,
): boolean {
  if (nextPhase === "phase-production-build") {
    return false;
  }

  return isProductionDeployment(deploymentEnv);
}

function isProductionDeployment(value: string | undefined): boolean {
  return value?.trim().toLowerCase() === "production";
}

function readDeploymentEnv(): string | undefined {
  return process.env.VERCEL_ENV ?? process.env.APP_ENV;
}
