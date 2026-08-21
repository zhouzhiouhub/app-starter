import {
  readSiteDomainHeader,
  storefrontHostHeaderName,
} from "@app-starter/schema";

const storefrontHostCacheParamName = "storefrontHost";

export function createStorefrontHostHeaders(
  storefrontHost?: string | null,
): HeadersInit | undefined {
  const host = readSiteDomainHeader(storefrontHost);

  return host ? { [storefrontHostHeaderName]: host } : undefined;
}

export function addStorefrontHostCacheParam(
  searchParams: URLSearchParams,
  storefrontHost?: string | null,
): URLSearchParams {
  const host = readSiteDomainHeader(storefrontHost);

  if (host) {
    searchParams.set(storefrontHostCacheParamName, host);
  }

  return searchParams;
}
