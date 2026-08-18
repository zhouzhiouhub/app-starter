type ViteEnv = {
  DEV?: boolean;
  VITE_API_URL?: string;
};

export function resolveApiBaseUrl(input: {
  configured?: string;
  hostname?: string;
  isDev?: boolean;
  protocol?: string;
}): string {
  if (input.configured) {
    return input.configured;
  }

  if (input.isDev) {
    return "/api/v1";
  }

  const protocol = input.protocol ?? "http:";
  const hostname = input.hostname || "localhost";

  return `${protocol}//${hostname}:4000/api/v1`;
}

export function getApiBaseUrl(): string {
  const env = (
    import.meta as unknown as {
      env?: ViteEnv;
    }
  ).env;
  const location = globalThis.location;

  return resolveApiBaseUrl({
    configured: env?.VITE_API_URL,
    hostname: location?.hostname,
    isDev: env?.DEV,
    protocol: location?.protocol,
  });
}
