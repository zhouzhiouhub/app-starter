import {
  isMediaAssetReference,
  isPublishableImageSrc,
  seoImageUrlSchema,
  seoUrlSchema,
} from "@app-starter/schema";
import type { SeoField } from "./seo-updates";

export interface SeoFieldFeedback {
  help?: string;
  status?: "error" | "warning";
}

export interface SeoFieldFeedbackOptions {
  storefrontOrigin?: string | null;
}

export function readSeoFieldFeedback(
  field: SeoField,
  value: string | undefined,
  options: SeoFieldFeedbackOptions = {},
): SeoFieldFeedback {
  const input = value?.trim() ?? "";

  if (!input) {
    return {};
  }

  if (field === "canonical") {
    if (!seoUrlSchema.safeParse(input).success) {
      return {
        help: "Use a relative URL or http(s) canonical URL.",
        status: "error",
      };
    }

    return readCanonicalOriginFeedback(input, options.storefrontOrigin);
  }

  if (field === "ogImage") {
    if (!seoImageUrlSchema.safeParse(input).success) {
      return {
        help: "Use a relative URL, HTTPS image URL, or media:// reference.",
        status: "error",
      };
    }

    if (!isPublishableImageSrc(input)) {
      return {
        help: "Use a relative URL, HTTPS image URL, or media:// reference.",
        status: "error",
      };
    }

    if (isMediaAssetReference(input)) {
      return {
        help: "Open Graph metadata uses this image after the media reference resolves.",
        status: "warning",
      };
    }
  }

  return {};
}

function readCanonicalOriginFeedback(
  canonical: string,
  storefrontOrigin: string | null | undefined,
): SeoFieldFeedback {
  const canonicalOrigin = readAbsoluteUrlOrigin(canonical);
  const expectedOrigin = readAbsoluteUrlOrigin(storefrontOrigin);

  if (!canonicalOrigin || !expectedOrigin || canonicalOrigin === expectedOrigin) {
    return {};
  }

  return {
    help: `Canonical URL points to ${canonicalOrigin}. Use a relative URL or the current storefront origin (${expectedOrigin}) unless this page should consolidate ranking elsewhere.`,
    status: "warning",
  };
}

function readAbsoluteUrlOrigin(value: string | null | undefined): string | null {
  const input = value?.trim();

  if (!input || !/^https?:\/\//i.test(input)) {
    return null;
  }

  try {
    return new URL(input).origin;
  } catch {
    return null;
  }
}
