type ViteEnv = {
  API_URL?: string;
  DEV?: boolean;
  VITE_API_URL?: string;
};

export function resolveApiBaseUrl(input: {
  configured?: string;
  fallbackConfigured?: string;
  isDev?: boolean;
}): string {
  if (input.isDev) {
    return "/api/v1";
  }

  return (
    readConfiguredApiBaseUrl(input.configured) ??
    readConfiguredApiBaseUrl(input.fallbackConfigured) ??
    "/api/v1"
  );
}

export function getApiBaseUrl(): string {
  const env = (
    import.meta as unknown as {
      env?: ViteEnv;
    }
  ).env;

  return resolveApiBaseUrl({
    configured: env?.VITE_API_URL,
    fallbackConfigured: env?.API_URL,
    isDev: env?.DEV,
  });
}

function readConfiguredApiBaseUrl(value: string | undefined): string | null {
  const trimmed = value?.trim();

  if (!trimmed) {
    return null;
  }

  if (trimmed.startsWith("/")) {
    return readRelativeApiBaseUrl(trimmed);
  }

  return readAbsoluteApiBaseUrl(trimmed);
}

function readRelativeApiBaseUrl(value: string): string | null {
  if (value.startsWith("//") || value.includes("?") || value.includes("#")) {
    return null;
  }

  return normalizeApiBasePath(value);
}

function readAbsoluteApiBaseUrl(value: string): string | null {
  try {
    const url = new URL(value);

    if (
      !isHttpProtocol(url.protocol) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    ) {
      return null;
    }

    const pathname = normalizeApiBasePath(url.pathname);
    return pathname ? `${url.origin}${pathname}` : null;
  } catch {
    return null;
  }
}

function normalizeApiBasePath(value: string): string | null {
  const trimmed = value.replace(/\/+$/, "");
  const pathname = trimmed || "/";

  if (pathname === "/") {
    return "/api/v1";
  }

  return pathname === "/api/v1" ? pathname : null;
}

function isHttpProtocol(protocol: string): boolean {
  return protocol === "http:" || protocol === "https:";
}
