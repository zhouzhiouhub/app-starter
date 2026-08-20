import { getStorefrontHref } from "@app-starter/schema";

export function getStorefrontPagePath(slug: string, locale = "en-US"): string {
  return getStorefrontHref(locale, slug);
}

export function getStorefrontPageUrl(slug: string, locale = "en-US"): string {
  return `${readWebOrigin()}${getStorefrontPagePath(slug, locale)}`;
}

export function getStorefrontPreviewUrl(token: string): string {
  const searchParams = new URLSearchParams({ token });
  return `${readWebOrigin()}/preview?${searchParams.toString()}`;
}

export function resolveWebOrigin(input: {
  configured?: string;
  windowLocation?: Pick<Location, "hostname" | "protocol">;
}): string {
  const configured = readHttpOrigin(input.configured);

  if (configured) {
    return configured;
  }

  if (
    input.windowLocation &&
    isHttpProtocol(input.windowLocation.protocol) &&
    input.windowLocation.hostname
  ) {
    return `${input.windowLocation.protocol}//${input.windowLocation.hostname}:3000`;
  }

  return "http://localhost:3000";
}

function readWebOrigin(): string {
  return resolveWebOrigin({
    configured: (
      import.meta as unknown as {
        env?: { VITE_WEB_URL?: string };
      }
    ).env?.VITE_WEB_URL,
    windowLocation:
      typeof window === "undefined"
        ? undefined
        : {
            hostname: window.location.hostname,
            protocol: window.location.protocol,
          },
  });
}

function readHttpOrigin(value: string | undefined): string | null {
  const trimmed = value?.trim();

  if (!trimmed) {
    return null;
  }

  try {
    const url = new URL(trimmed);

    if (!isHttpProtocol(url.protocol) || url.username || url.password) {
      return null;
    }

    return url.origin;
  } catch {
    return null;
  }
}

function isHttpProtocol(protocol: string): boolean {
  return protocol === "http:" || protocol === "https:";
}
