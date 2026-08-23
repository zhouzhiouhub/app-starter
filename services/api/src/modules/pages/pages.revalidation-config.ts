import { isUnsafeProductionHostname } from "@app-starter/schema";

const defaultTimeoutMs = 5000;
const maxTimeoutMs = 30000;

export function resolveStorefrontRevalidateUrl(
  env: {
    APP_ENV?: string;
    NODE_ENV?: string;
    STOREFRONT_REVALIDATE_URL?: string;
    VERCEL_ENV?: string;
    WEB_URL?: string;
  } = process.env,
): string | null {
  const rawConfigured = env.STOREFRONT_REVALIDATE_URL?.trim();
  const requireProductionUrl = isProductionRevalidationEnvironment(env);
  const configured = readSafeHttpUrl(
    env.STOREFRONT_REVALIDATE_URL,
    requireProductionUrl,
  );

  if (configured) {
    return createRevalidateEndpointUrl(configured);
  }

  if (rawConfigured) {
    return null;
  }

  const webUrl = readSafeHttpUrl(env.WEB_URL, requireProductionUrl);

  if (!webUrl) {
    return null;
  }

  return `${webUrl.origin}/api/revalidate`;
}

export function readStorefrontRevalidationTimeoutMs(
  env: Record<string, string | undefined> = process.env,
): number {
  const value = env.STOREFRONT_REVALIDATE_TIMEOUT_MS?.trim();

  if (!value || !/^\d+$/.test(value)) {
    return defaultTimeoutMs;
  }

  const parsed = Number(value);

  if (Number.isSafeInteger(parsed) && parsed > 0 && parsed <= maxTimeoutMs) {
    return parsed;
  }

  return defaultTimeoutMs;
}

export function isProductionRevalidationEnvironment(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return [env.NODE_ENV, env.APP_ENV, env.VERCEL_ENV].some(
    (value) => value?.trim().toLowerCase() === "production",
  );
}

function createRevalidateEndpointUrl(url: URL): string {
  const pathname = trimTrailingSlashes(url.pathname);

  if (pathname === "/") {
    return `${url.origin}/api/revalidate`;
  }

  return `${url.origin}${pathname}`;
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
      (requireProductionUrl && url.protocol !== "https:") ||
      (requireProductionUrl && isUnsafeProductionHostname(url.hostname)) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
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

function isHttpProtocol(protocol: string): boolean {
  return protocol === "http:" || protocol === "https:";
}
