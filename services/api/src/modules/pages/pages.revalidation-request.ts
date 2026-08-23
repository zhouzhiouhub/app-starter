import { storefrontRevalidateSecretHeader } from "@app-starter/schema";
import { requestIdHeaderName } from "../../common/request-id.js";
import type { StorefrontRevalidationInput } from "./pages.revalidation.js";

export type StorefrontRevalidationPayload = Omit<
  StorefrontRevalidationInput,
  "requestId"
>;

export function createStorefrontRevalidationHeaders(
  secret: string,
  requestId: string | undefined,
): Record<string, string> {
  const headers = {
    "Content-Type": "application/json",
    [storefrontRevalidateSecretHeader]: secret,
  };

  return requestId
    ? {
        ...headers,
        [requestIdHeaderName]: requestId,
      }
    : headers;
}

export function createStorefrontRevalidationPayload(
  input: StorefrontRevalidationInput,
): StorefrontRevalidationPayload {
  const payload: StorefrontRevalidationPayload = {
    locale: input.locale,
    market: input.market,
    slug: input.slug,
  };

  if (input.siteHost) {
    payload.siteHost = input.siteHost;
  }

  return payload;
}
