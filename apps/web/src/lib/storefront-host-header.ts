import {
  readSiteDomainHeader,
  storefrontHostHeaderName,
} from "@app-starter/schema";

export function createStorefrontHostHeaders(
  storefrontHost?: string | null,
): HeadersInit | undefined {
  const host = readSiteDomainHeader(storefrontHost);

  return host ? { [storefrontHostHeaderName]: host } : undefined;
}
