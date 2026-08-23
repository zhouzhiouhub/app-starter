import { isProductionHttpUrl } from "@app-starter/schema";

export function readSafePublicOrigin(value: string | undefined): string | null {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);

    return isOriginOnly(url) &&
      (isProductionHttpUrl(url) || isLocalhostHttpOrigin(url))
      ? url.origin
      : null;
  } catch {
    return null;
  }
}

function isOriginOnly(url: URL): boolean {
  return (
    !url.username &&
    !url.password &&
    !url.search &&
    !url.hash &&
    trimTrailingSlashes(url.pathname) === "/"
  );
}

function isLocalhostHttpOrigin(url: URL): boolean {
  return url.protocol === "http:" && url.hostname === "localhost";
}

function trimTrailingSlashes(value: string): string {
  const trimmed = value.replace(/\/+$/, "");
  return trimmed || "/";
}
