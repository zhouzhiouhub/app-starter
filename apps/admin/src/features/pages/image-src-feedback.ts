import { seoImageUrlSchema } from "@app-starter/schema";

export interface ImageSrcFeedback {
  help?: string;
  status?: "error" | "warning";
}

const invalidImageSrcHelp =
  "Use a relative URL, http(s) image URL, or media://asset-id reference.";
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

  if (seoImageUrlSchema.safeParse(src).success) {
    return {};
  }

  return {
    help: invalidImageSrcHelp,
    status: "error",
  };
}
