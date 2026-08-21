import { headers } from "next/headers";
import { readStorefrontHostFromHeaders } from "./storefront-request-headers.ts";

export async function readStorefrontRequestHost(): Promise<string | null> {
  const requestHeaders = await headers();

  return readStorefrontHostFromHeaders(requestHeaders);
}
