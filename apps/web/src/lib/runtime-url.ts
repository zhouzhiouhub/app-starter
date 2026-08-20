const defaultApiBaseUrl = "http://localhost:4000/api/v1";
const defaultWebOrigin = "http://localhost:3000";

export function getApiBaseUrl(): string {
  return resolveApiBaseUrl({
    configuredUrl: process.env.API_URL,
    internalUrl: process.env.API_INTERNAL_URL,
    publicUrl: process.env.NEXT_PUBLIC_API_URL,
  });
}

export function resolveApiBaseUrl(input: {
  configuredUrl?: string;
  internalUrl?: string;
  publicUrl?: string;
}): string {
  return (
    readHttpBaseUrl(input.internalUrl) ??
    readHttpBaseUrl(input.configuredUrl) ??
    readHttpBaseUrl(input.publicUrl) ??
    defaultApiBaseUrl
  );
}

export function resolveWebOrigin(input: {
  publicWebUrl?: string;
  webUrl?: string;
}): string {
  return (
    readHttpOrigin(input.webUrl) ??
    readHttpOrigin(input.publicWebUrl) ??
    defaultWebOrigin
  );
}

function readHttpBaseUrl(value: string | undefined): string | null {
  const url = readSafeHttpUrl(value);

  if (!url) {
    return null;
  }

  return `${url.origin}${trimTrailingSlashes(url.pathname)}`;
}

function readHttpOrigin(value: string | undefined): string | null {
  return readSafeHttpUrl(value)?.origin ?? null;
}

function readSafeHttpUrl(value: string | undefined): URL | null {
  const trimmed = value?.trim();

  if (!trimmed) {
    return null;
  }

  try {
    const url = new URL(trimmed);

    if (
      !isHttpProtocol(url.protocol) ||
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
