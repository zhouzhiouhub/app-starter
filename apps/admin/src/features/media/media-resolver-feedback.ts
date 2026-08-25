import type { MediaAssetReference } from "@app-starter/schema";
import { readMissingMediaReferences } from "./media-reference-resolution.ts";

export type MediaResolverFeedbackType = "error" | "info" | "warning";

export interface MediaResolverFeedback {
  description?: string;
  message: string;
  type: MediaResolverFeedbackType;
}

export function readMediaResolverFeedback(input: {
  error?: string | null;
  isLoading: boolean;
  references: MediaAssetReference[];
  urlsByReference: Record<string, string>;
}): MediaResolverFeedback | null {
  if (input.error) {
    return {
      description: "Preview may show unresolved media:// references.",
      message: input.error,
      type: "error",
    };
  }

  if (input.isLoading && input.references.length > 0) {
    return {
      message: "Resolving media references...",
      type: "info",
    };
  }

  const missingReferences = readMissingMediaReferences(
    input.references,
    input.urlsByReference,
  );

  if (missingReferences.length === 0) {
    return null;
  }

  return {
    description: formatMissingReferences(missingReferences),
    message: "Some media references are unavailable.",
    type: "warning",
  };
}

function formatMissingReferences(
  references: MediaAssetReference[],
): string {
  const visibleReferences = references.slice(0, 3).join(", ");
  const remainingCount = references.length - 3;

  if (remainingCount <= 0) {
    return `Missing references: ${visibleReferences}`;
  }

  return `Missing references: ${visibleReferences}, and ${remainingCount} more.`;
}
