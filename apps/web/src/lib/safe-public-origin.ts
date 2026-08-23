import { isProductionHttpUrl } from "@app-starter/schema";

export function readSafePublicOrigin(value: string | undefined): string | null {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);

    return isProductionHttpUrl(url) || isLocalhostHttpOrigin(url)
      ? url.origin
      : null;
  } catch {
    return null;
  }
}

function isLocalhostHttpOrigin(url: URL): boolean {
  return url.protocol === "http:" && url.hostname === "localhost";
}
