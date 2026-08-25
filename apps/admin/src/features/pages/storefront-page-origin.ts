import {
  readStorefrontPageUrl,
  type WebOriginInput,
} from "./storefront-url.ts";

export type { WebOriginInput };

export function readStorefrontPageOrigin(input: {
  locale?: string;
  runtime?: WebOriginInput;
  siteDomain?: string | null;
  slug: string;
}): string | null {
  const pageUrl = readStorefrontPageUrl(input);

  if (!pageUrl.ok) {
    return null;
  }

  return new URL(pageUrl.href).origin;
}
