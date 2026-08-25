import {
  pageMediaReferenceMaxCount,
  type MediaAssetReference,
} from "@app-starter/schema";
import type { MediaResolverFeedback } from "../media/media-resolver-feedback.ts";
import type { PublishPreflightIssue } from "./publish-preflight-types.ts";

export function collectMediaPublishPreflightIssues(input: {
  feedback: MediaResolverFeedback | null;
  references: MediaAssetReference[];
}): PublishPreflightIssue[] {
  return [
    readMediaReferenceLimitPreflightIssue(input.references),
    readMediaPublishPreflightIssue(input.feedback),
  ].filter(isPublishPreflightIssue);
}

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

export function readMediaReferenceLimitPreflightIssue(
  references: MediaAssetReference[],
): PublishPreflightIssue | null {
  if (references.length <= pageMediaReferenceMaxCount) {
    return null;
  }

  return {
    field: "media.references",
    message: `Page references ${references.length} media assets, above the publish limit of ${pageMediaReferenceMaxCount}. Remove unused media references before publishing.`,
    severity: "error",
  };
}

function isPublishPreflightIssue(
  issue: PublishPreflightIssue | null,
): issue is PublishPreflightIssue {
  return issue !== null;
}
