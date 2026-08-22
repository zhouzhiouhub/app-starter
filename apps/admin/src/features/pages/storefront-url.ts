import {
  getStorefrontHref,
  isProductionHttpUrl,
  readSiteDomainHeader,
} from "@app-starter/schema";

const maxPreviewTokenLength = 2048;
const previewTokenPattern = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{43}$/;

interface WebOriginInput {
  configured?: string;
  fallbackConfigured?: string;
  isProd?: boolean;
  windowLocation?: Pick<Location, "hostname" | "protocol">;
}

interface StorefrontOriginInput extends WebOriginInput {
  siteDomain?: string | null;
}

export function getStorefrontPagePath(slug: string, locale = "en-US"): string {
  return getStorefrontHref(locale, slug);
}

export function getStorefrontPageUrl(
  slug: string,
  locale = "en-US",
  siteDomain?: string | null,
): string {
  return `${readStorefrontOrigin(siteDomain)}${getStorefrontPagePath(
    slug,
    locale,
  )}`;
}

export function getStorefrontPreviewUrl(
  token: string,
  siteDomain?: string | null,
): string {
  if (!isPreviewTokenCandidate(token)) {
    throw new Error("Preview token is malformed.");
  }

  const searchParams = new URLSearchParams({ token });
  return `${readStorefrontOrigin(siteDomain)}/preview?${searchParams.toString()}`;
}

export function resolveStorefrontOrigin(input: StorefrontOriginInput): string {
  const domain = readSiteDomainHeader(input.siteDomain);

  if (domain) {
    return `${readSiteDomainProtocol(domain)}://${domain}`;
  }

  return resolveWebOrigin(input);
}

export function resolveWebOrigin(input: WebOriginInput): string {
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

function readStorefrontOrigin(siteDomain?: string | null): string {
  const env = (
    import.meta as unknown as {
      env?: { PROD?: boolean; VITE_WEB_URL?: string; WEB_URL?: string };
    }
  ).env;

  return resolveStorefrontOrigin({
    configured: env?.VITE_WEB_URL,
    fallbackConfigured: env?.WEB_URL,
    isProd: env?.PROD,
    siteDomain,
    windowLocation:
      typeof window === "undefined"
        ? undefined
        : {
            hostname: window.location.hostname,
            protocol: window.location.protocol,
          },
  });
}

function readSiteDomainProtocol(domain: string): "http" | "https" {
  return domain === "localhost" || domain.startsWith("localhost:")
    ? "http"
    : "https";
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
