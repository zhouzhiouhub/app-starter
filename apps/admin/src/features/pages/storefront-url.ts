import { getStorefrontHref, isProductionHttpUrl } from "@app-starter/schema";

const maxPreviewTokenLength = 2048;
const previewTokenPattern = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{43}$/;

export function getStorefrontPagePath(slug: string, locale = "en-US"): string {
  return getStorefrontHref(locale, slug);
}

export function getStorefrontPageUrl(slug: string, locale = "en-US"): string {
  return `${readWebOrigin()}${getStorefrontPagePath(slug, locale)}`;
}

export function getStorefrontPreviewUrl(token: string): string {
  if (!isPreviewTokenCandidate(token)) {
    throw new Error("Preview token is malformed.");
  }

  const searchParams = new URLSearchParams({ token });
  return `${readWebOrigin()}/preview?${searchParams.toString()}`;
}

export function resolveWebOrigin(input: {
  configured?: string;
  fallbackConfigured?: string;
  isProd?: boolean;
  windowLocation?: Pick<Location, "hostname" | "protocol">;
}): string {
  const requireProductionUrl = input.isProd === true;
  const configured =
    readHttpOrigin(input.configured, requireProductionUrl) ??
    readHttpOrigin(input.fallbackConfigured, requireProductionUrl);

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
  const env = (
    import.meta as unknown as {
      env?: { PROD?: boolean; VITE_WEB_URL?: string; WEB_URL?: string };
    }
  ).env;

  return resolveWebOrigin({
    configured: env?.VITE_WEB_URL,
    fallbackConfigured: env?.WEB_URL,
    isProd: env?.PROD,
    windowLocation:
      typeof window === "undefined"
        ? undefined
        : {
            hostname: window.location.hostname,
            protocol: window.location.protocol,
          },
  });
}

function readHttpOrigin(
  value: string | undefined,
  requireProductionUrl: boolean,
): string | null {
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
      trimTrailingSlashes(url.pathname) !== "/" ||
      url.search ||
      url.hash ||
      (requireProductionUrl && !isProductionHttpUrl(url))
    ) {
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

function trimTrailingSlashes(value: string): string {
  const trimmed = value.replace(/\/+$/, "");
  return trimmed || "/";
}

function isPreviewTokenCandidate(token: string): boolean {
  return (
    token.length <= maxPreviewTokenLength &&
    token.trim() === token &&
    previewTokenPattern.test(token)
  );
}
