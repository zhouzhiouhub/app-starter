const defaultAdminOrigin = "http://localhost:5173";
const defaultWebOrigin = "http://localhost:3000";
const corsOriginDeniedMessage = "CORS origin denied.";

type CorsOriginCallback = (error: Error | null, allowed?: boolean) => void;

export function readConfiguredCorsOrigins(
  env: { ADMIN_URL?: string; NODE_ENV?: string; WEB_URL?: string } =
    process.env,
): string[] {
  const useLocalDefaults = env.NODE_ENV !== "production";

  return uniqueOrigins([
    readConfiguredHttpOrigin(
      env.WEB_URL,
      useLocalDefaults ? defaultWebOrigin : undefined,
    ),
    readConfiguredHttpOrigin(
      env.ADMIN_URL,
      useLocalDefaults ? defaultAdminOrigin : undefined,
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
): string | null {
  const configured = value?.trim();

  if (configured) {
    return readHttpOrigin(configured);
  }

  return fallback ? readHttpOrigin(fallback) : null;
}

function readHttpOrigin(value: string): string | null {
  try {
    const url = new URL(value);

    if (!isHttpProtocol(url.protocol) || url.username || url.password) {
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
