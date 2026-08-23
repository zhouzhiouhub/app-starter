import { readForwardableStorefrontHost } from "./storefront-host-header.ts";

type RequestHeaders = {
  get(name: string): string | null;
};

export function readStorefrontHostFromHeaders(
  requestHeaders: RequestHeaders,
): string | null {
  return (
    readForwardableStorefrontHost(requestHeaders.get("host")) ??
    readForwardableStorefrontHost(requestHeaders.get("x-forwarded-host"))
  );
}
