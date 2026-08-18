export function getApiBaseUrl(): string {
  const configured = (
    import.meta as unknown as {
      env?: { VITE_API_URL?: string };
    }
  ).env?.VITE_API_URL;

  if (configured) {
    return configured;
  }

  const location = globalThis.location;
  const protocol = location?.protocol ?? "http:";
  const hostname = location?.hostname || "localhost";

  return `${protocol}//${hostname}:4000/api/v1`;
}
