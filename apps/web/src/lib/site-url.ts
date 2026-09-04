import { readSiteDomainHeader } from "@app-starter/schema";
import { resolveWebOrigin } from "./runtime-url.ts";

export function getWebOrigin(): string {
  return resolveWebOrigin({
    deploymentEnv: process.env.VERCEL_ENV ?? process.env.APP_ENV,
    nextPhase: process.env.NEXT_PHASE,
    publicWebUrl: process.env.NEXT_PUBLIC_WEB_URL,
    vercelUrl: process.env.VERCEL_URL,
    webUrl: process.env.WEB_URL,
  });
}

export function getStorefrontOrigin(input?: {
  storefrontHost?: string | null;
}): string {
  return resolveStorefrontOrigin(input?.storefrontHost) ?? getWebOrigin();
}

export function resolveStorefrontOrigin(
  storefrontHost?: string | null,
): string | null {
  const host = readSiteDomainHeader(storefrontHost);

  if (!host) {
    return null;
  }

  return `${readStorefrontOriginProtocol(host)}://${host}`;
}

function readStorefrontOriginProtocol(host: string): "http" | "https" {
  return host === "localhost" || host.startsWith("localhost:")
    ? "http"
    : "https";
}
