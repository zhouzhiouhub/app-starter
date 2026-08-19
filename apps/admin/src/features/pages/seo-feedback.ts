import {
  isMediaAssetReference,
  seoImageUrlSchema,
  seoUrlSchema,
} from "@app-starter/schema";
import type { SeoField } from "./seo-updates";

export interface SeoFieldFeedback {
  help?: string;
  status?: "error" | "warning";
}

export function readSeoFieldFeedback(
  field: SeoField,
  value: string | undefined,
): SeoFieldFeedback {
  const input = value?.trim() ?? "";

  if (!input) {
    return {};
  }

  if (field === "canonical") {
    return seoUrlSchema.safeParse(input).success
      ? {}
      : {
          help: "Use a relative URL or http(s) canonical URL.",
          status: "error",
        };
  }

  if (field === "ogImage") {
    if (!seoImageUrlSchema.safeParse(input).success) {
      return {
        help: "Use a relative URL, http(s) image URL, or media:// reference.",
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
