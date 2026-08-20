import type { MediaResolverFeedback } from "../media/media-resolver-feedback.ts";
import type { PublishPreflightIssue } from "./publish-preflight-types.ts";

export function readMediaPublishPreflightIssue(
  feedback: MediaResolverFeedback | null,
): PublishPreflightIssue | null {
  if (!feedback) {
    return null;
  }

  if (feedback.type === "info") {
    return {
      field: "media.references",
      message:
        "Media references are still resolving. Wait for preview media to finish loading before publishing.",
      severity: "error",
    };
  }

  if (feedback.type === "error") {
    return {
      field: "media.references",
      message: `Media references could not be verified. ${feedback.message}`,
      severity: "error",
    };
  }

  return {
    field: "media.references",
    message: `Media references are unavailable. ${
      feedback.description ?? feedback.message
    }`,
    severity: "error",
  };
}
