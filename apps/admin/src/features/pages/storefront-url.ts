import {
  isProductionHttpUrl,
  readSiteDomainHeader,
} from "@app-starter/schema";
import {
  AdminStorefrontPathError,
  getStorefrontPagePath,
  storefrontPathUnavailableMessage,
} from "./storefront-path.ts";

const maxPreviewTokenLength = 2048;
const previewTokenPattern = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{43}$/;
const storefrontLinkUnavailableMessage =
  "Configure VITE_WEB_URL or WEB_URL with a safe storefront origin before opening storefront links.";

export class AdminStorefrontUrlConfigurationError extends Error {
  constructor() {
    super(
      "VITE_WEB_URL or WEB_URL must be configured as a safe storefront origin in production.",
    );
    this.name = "AdminStorefrontUrlConfigurationError";
  }
}

export interface WebOriginInput {
  configured?: string;
  fallbackConfigured?: string;
  isProd?: boolean;
  windowLocation?: Pick<Location, "hostname" | "protocol">;
}

interface StorefrontOriginInput extends WebOriginInput {
  siteDomain?: string | null;
}

export type StorefrontPageUrlResult =
  | {
      href: string;
      ok: true;
    }
  | {
      message: string;
      ok: false;
    };

export type StorefrontLinkAvailability =
  | {
      ok: true;
    }
  | {
      message: string;
      ok: false;
    };

export function getStorefrontPageUrl(
  slug: string,
  locale = "en-US",
  siteDomain?: string | null,
  runtime?: WebOriginInput,
): string {
  const path = getStorefrontPagePath(slug, locale);
  return `${readStorefrontOrigin(siteDomain, runtime)}${path}`;
}

export function readStorefrontPageUrl(input: {
  locale?: string;
  runtime?: WebOriginInput;
  siteDomain?: string | null;
  slug: string;
}): StorefrontPageUrlResult {
  try {
    return {
      href: getStorefrontPageUrl(
        input.slug,
        input.locale,
        input.siteDomain,
        input.runtime,
      ),
      ok: true,
    };
  } catch (error) {
    if (error instanceof AdminStorefrontUrlConfigurationError) {
      return {
        message: storefrontLinkUnavailableMessage,
        ok: false,
      };
    }

    if (error instanceof AdminStorefrontPathError) {
      return {
        message: storefrontPathUnavailableMessage,
        ok: false,
      };
    }

    throw error;
  }
}

export function readStorefrontLinkAvailability(input?: {
  runtime?: WebOriginInput;
  siteDomain?: string | null;
}): StorefrontLinkAvailability {
  try {
    readStorefrontOrigin(input?.siteDomain, input?.runtime);
    return { ok: true };
  } catch (error) {
    if (error instanceof AdminStorefrontUrlConfigurationError) {
      return {
        message: storefrontLinkUnavailableMessage,
        ok: false,
      };
    }

    throw error;
  }
}

export function getStorefrontPreviewUrl(
  token: string,
  siteDomain?: string | null,
  runtime?: WebOriginInput,
): string {
  if (!isPreviewTokenCandidate(token)) {
    throw new Error("Preview token is malformed.");
  }

  const searchParams = new URLSearchParams({ token });
  return `${readStorefrontOrigin(siteDomain, runtime)}/preview?${searchParams.toString()}`;
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

  if (requireProductionUrl) {
    throw new AdminStorefrontUrlConfigurationError();
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

function readStorefrontOrigin(
  siteDomain?: string | null,
  runtime?: WebOriginInput,
): string {
  const defaults = readDefaultWebOriginInput();

  return resolveStorefrontOrigin({
    configured: runtime?.configured ?? defaults.configured,
    fallbackConfigured: runtime?.fallbackConfigured ?? defaults.fallbackConfigured,
    isProd: runtime?.isProd ?? defaults.isProd,
    siteDomain,
    windowLocation: runtime?.windowLocation ?? defaults.windowLocation,
  });
}

function readDefaultWebOriginInput(): WebOriginInput {
  const env = (
    import.meta as unknown as {
      env?: { PROD?: boolean; VITE_WEB_URL?: string; WEB_URL?: string };
    }
  ).env;

  return {
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
  };
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
