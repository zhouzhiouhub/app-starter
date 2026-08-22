import { isProductionHttpOrigin } from "./production-origin.js";

const defaultAdminOrigin = "http://localhost:5173";
const defaultWebOrigin = "http://localhost:3000";
const corsOriginDeniedMessage = "CORS origin denied.";

type CorsOriginCallback = (error: Error | null, allowed?: boolean) => void;

export function readConfiguredCorsOrigins(
  env: CorsEnvironment = process.env,
): string[] {
  const isProduction = isProductionCorsEnvironment(env);
  const useLocalDefaults = !isProduction;

  return uniqueOrigins([
    readConfiguredHttpOrigin(
      env.WEB_URL,
      useLocalDefaults ? defaultWebOrigin : undefined,
      isProduction,
    ),
    readConfiguredHttpOrigin(
      env.ADMIN_URL,
      useLocalDefaults ? defaultAdminOrigin : undefined,
      isProduction,
    ),
  ]);
}

export function isAllowedCorsOrigin(input: {
  configuredOrigins: string[];
  isProduction: boolean;
  origin: string | undefined;
}): boolean {
  if (!input.origin) {
    return true;
  }

  return (
    input.configuredOrigins.includes(input.origin) ||
    (!input.isProduction && isAllowedDevOrigin(input.origin))
  );
}

export function createCorsOriginResolver(input: {
  configuredOrigins: string[];
  isProduction: boolean;
}): (origin: string | undefined, callback: CorsOriginCallback) => void {
  return (origin, callback) => {
    if (
      isAllowedCorsOrigin({
        ...input,
        origin,
      })
    ) {
      callback(null, true);
      return;
    }

    callback(new Error(corsOriginDeniedMessage));
  };
}

export type CorsEnvironment = {
  ADMIN_URL?: string;
  APP_ENV?: string;
  NODE_ENV?: string;
  VERCEL_ENV?: string;
  WEB_URL?: string;
};

export function isProductionCorsEnvironment(env: CorsEnvironment): boolean {
  return [env.NODE_ENV, env.APP_ENV, env.VERCEL_ENV].some(
    (value) => value?.trim().toLowerCase() === "production",
  );
}

export function isAllowedDevOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);

    if (!isHttpProtocol(url.protocol) || url.username || url.password) {
      return false;
    }

    if (
      url.hostname === "localhost" ||
      url.hostname === "127.0.0.1" ||
      url.hostname === "::1" ||
      url.hostname === "[::1]"
    ) {
      return true;
    }

    return isPrivateIpv4(url.hostname);
  } catch {
    return false;
  }
}

function readConfiguredHttpOrigin(
  value: string | undefined,
  fallback: string | undefined,
  requireProductionOrigin: boolean,
): string | null {
  const configured = value?.trim();

  if (configured) {
    return readHttpOrigin(configured, requireProductionOrigin);
  }

  return fallback ? readHttpOrigin(fallback, requireProductionOrigin) : null;
}

function readHttpOrigin(
  value: string,
  requireProductionOrigin = false,
): string | null {
  try {
    const url = new URL(value);

    if (!isHttpProtocol(url.protocol) || url.username || url.password) {
      return null;
    }

    if (requireProductionOrigin && !isProductionHttpOrigin(url)) {
      return null;
    }

    return url.origin;
  } catch {
    return null;
  }
}

function uniqueOrigins(values: Array<string | null>): string[] {
  return Array.from(
    new Set(values.filter((value): value is string => Boolean(value))),
  );
}

function isHttpProtocol(protocol: string): boolean {
  return protocol === "http:" || protocol === "https:";
}

function isPrivateIpv4(hostname: string): boolean {
  const parts = hostname.split(".").map((part) => Number(part));

  if (
    parts.length !== 4 ||
    parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)
  ) {
    return false;
  }

  const first = parts[0] ?? -1;
  const second = parts[1] ?? -1;

  return (
    first === 10 ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168)
  );
}
