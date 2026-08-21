import { isProductionHttpUrl } from "@app-starter/schema";

export function isProductionHttpOrigin(url: URL): boolean {
  return isProductionHttpUrl(url) && isOriginOnlyUrl(url);
}

function isOriginOnlyUrl(url: URL): boolean {
  return url.pathname.replace(/\/+$/, "") === "" && !url.search && !url.hash;
}
