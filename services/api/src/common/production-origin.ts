import { isUnsafeProductionHostname } from "./production-hostname.js";

export function isProductionHttpOrigin(url: URL): boolean {
  return (
    url.protocol === "https:" &&
    isOriginOnlyUrl(url) &&
    !isUnsafeProductionHostname(url.hostname)
  );
}

function isOriginOnlyUrl(url: URL): boolean {
  return url.pathname.replace(/\/+$/, "") === "" && !url.search && !url.hash;
}
