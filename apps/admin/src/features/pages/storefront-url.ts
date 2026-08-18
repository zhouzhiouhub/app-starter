import { getStorefrontHref } from "@app-starter/schema";

export function getStorefrontPagePath(
  slug: string,
  locale = "en-US",
): string {
  return getStorefrontHref(locale, slug);
}

export function getStorefrontPageUrl(
  slug: string,
  locale = "en-US",
): string {
  return `${readWebOrigin()}${getStorefrontPagePath(slug, locale)}`;
}

function readWebOrigin(): string {
  const configured = (
    import.meta as unknown as {
      env?: { VITE_WEB_URL?: string };
    }
  ).env?.VITE_WEB_URL?.trim();

  if (configured) {
    return configured.replace(/\/$/, "");
  }

  if (typeof window !== "undefined") {
    return `${window.location.protocol}//${window.location.hostname}:3000`;
  }

  return "http://localhost:3000";
}
