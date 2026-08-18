export function getApiBaseUrl(): string {
  const configured = readViteApiUrl();

  if (configured) {
    return configured.replace(/\/$/, "");
  }

  return "/api/v1";
}

function readViteApiUrl(): string | undefined {
  const value = (
    import.meta as unknown as {
      env?: { VITE_API_URL?: string };
    }
  ).env?.VITE_API_URL?.trim();

  return value || undefined;
}
