import { readSiteDomainHeader } from "@app-starter/schema";
import { headers } from "next/headers";

export async function readStorefrontRequestHost(): Promise<string | null> {
  const requestHeaders = await headers();

  return (
    readSiteDomainHeader(requestHeaders.get("host")) ??
    readSiteDomainHeader(requestHeaders.get("x-forwarded-host"))
  );
}
