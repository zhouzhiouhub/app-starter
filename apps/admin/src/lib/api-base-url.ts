type ViteEnv = {
  DEV?: boolean;
  VITE_API_URL?: string;
};

export function resolveApiBaseUrl(input: {
  configured?: string;
  isDev?: boolean;
}): string {
  if (input.isDev) {
    return "/api/v1";
  }

  return readConfiguredApiBaseUrl(input.configured) ?? "/api/v1";
}

export function getApiBaseUrl(): string {
  const env = (
    import.meta as unknown as {
      env?: ViteEnv;
    }
  ).env;

  return resolveApiBaseUrl({
    configured: env?.VITE_API_URL,
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

  return trimTrailingSlashes(value);
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

    return `${url.origin}${trimTrailingSlashes(url.pathname)}`;
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
