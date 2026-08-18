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

  const configured = input.configured?.trim();

  if (configured) {
    return configured.replace(/\/$/, "");
  }

  return "/api/v1";
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
