export function getApiBaseUrl(): string {
  if (isViteDevServer()) {
    return "/api/v1";
  }

  const configured = readViteApiUrl();

  if (configured) {
    return configured.replace(/\/$/, "");
  }

  return "/api/v1";
}

function isViteDevServer(): boolean {
  return (
    (
      import.meta as unknown as {
        env?: { DEV?: boolean };
      }
    ).env?.DEV === true
  );
}

function readViteApiUrl(): string | undefined {
  const value = (
    import.meta as unknown as {
      env?: { VITE_API_URL?: string };
    }
  ).env?.VITE_API_URL?.trim();

  return value || undefined;
}
