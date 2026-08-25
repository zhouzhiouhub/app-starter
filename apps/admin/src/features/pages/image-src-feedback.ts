import {
  hasSensitiveUrlParameters,
  isPublishableImageSrc,
} from "@app-starter/schema";

export interface ImageSrcFeedback {
  help?: string;
  status?: "error" | "warning";
}

const invalidImageSrcHelp =
  "Use a relative URL, HTTPS image URL, or media://asset-id reference.";
const sensitiveImageSrcHelp =
  "Remove token, signature, key, or secret query parameters before publishing.";
const emptyImageSrcHelp = "Add an image URL or media reference before publishing.";

export function readImageSrcFeedback(
  value: string | undefined,
  options: { allowEmpty?: boolean } = {},
): ImageSrcFeedback {
  const src = value?.trim() ?? "";

  if (!src) {
    return options.allowEmpty
      ? {}
      : {
          help: emptyImageSrcHelp,
          status: "warning",
        };
  }

  if (isPublishableImageSrc(src)) {
    return {};
  }

  return {
    help: hasSensitiveUrlParameters(src)
      ? sensitiveImageSrcHelp
      : invalidImageSrcHelp,
    status: "error",
  };
}
