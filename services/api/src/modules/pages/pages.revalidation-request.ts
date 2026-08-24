import { storefrontRevalidateSecretHeader } from "@app-starter/schema";
import {
  readRequestId,
  requestIdHeaderName,
} from "../../common/request-id.js";
import type { StorefrontRevalidationInput } from "./pages.revalidation.js";

export type StorefrontRevalidationPayload = Omit<
  StorefrontRevalidationInput,
  "fallbackLocale" | "requestId"
>;

export function createStorefrontRevalidationHeaders(
  secret: string,
  requestId: string | undefined,
): Record<string, string> {
  const forwardedRequestId = readForwardedRequestId(requestId);
  const headers = {
    "Content-Type": "application/json",
    [storefrontRevalidateSecretHeader]: secret,
  };

  return forwardedRequestId
    ? {
        ...headers,
        [requestIdHeaderName]: forwardedRequestId,
      }
    : headers;
}

function readForwardedRequestId(requestId: string | undefined): string | null {
  if (!requestId) {
    return null;
  }

  return readRequestId({ "x-request-id": requestId }, "") || null;
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
