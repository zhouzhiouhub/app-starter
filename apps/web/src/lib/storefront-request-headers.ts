import { readSiteDomainHeader } from "@app-starter/schema";

type RequestHeaders = {
  get(name: string): string | null;
};

export function readStorefrontHostFromHeaders(
  requestHeaders: RequestHeaders,
): string | null {
  return (
    readSiteDomainHeader(requestHeaders.get("host")) ??
    readSiteDomainHeader(requestHeaders.get("x-forwarded-host"))
  );
}
