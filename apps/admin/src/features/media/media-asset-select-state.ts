import type { MediaAsset } from "./types";

export interface MediaAssetSelectState {
  help?: string;
  notFoundContent: string;
  status?: "error" | "warning";
}

export function readMediaAssetSelectState(input: {
  assets: Array<Pick<MediaAsset, "reference">>;
  error?: string | null;
  isLoading: boolean;
  value?: string;
}): MediaAssetSelectState {
  if (input.error) {
    return {
      help: input.error,
      notFoundContent: "Media assets could not be loaded.",
      status: "error",
    };
  }

  if (input.isLoading) {
    return { notFoundContent: "Loading media assets..." };
  }

  if (!input.assets.length) {
    return { notFoundContent: "No active image assets." };
  }

  if (
    input.value &&
    !input.assets.some((asset) => asset.reference === input.value)
  ) {
    return {
      help:
        "Selected media reference is not available in active images. It may be archived, missing, or not an image.",
      notFoundContent: "No matching active image assets.",
      status: "warning",
    };
  }

  return { notFoundContent: "No matching active image assets." };
}
