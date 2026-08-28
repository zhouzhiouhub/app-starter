import type { MediaAssetReference } from "@app-starter/schema";
import {
  readMediaReferenceResolutionIssues,
  type MediaReferenceResolutionIssue,
} from "./media-reference-resolution.ts";
import type { MediaAssetType } from "./types";

export type MediaResolverFeedbackType = "error" | "info" | "warning";

export interface MediaResolverFeedback {
  affectedReferenceCount?: number;
  description?: string;
  message: string;
  missingReferenceCount?: number;
  type: MediaResolverFeedbackType;
  unsupportedReferenceCount?: number;
}

export function readMediaResolverFeedback(input: {
  error?: string | null;
  isLoading: boolean;
  mediaTypesByReference?: Record<string, MediaAssetType>;
  references: MediaAssetReference[];
  urlsByReference: Record<string, string>;
}): MediaResolverFeedback | null {
  const referenceCount = countUniqueReferences(input.references);

  if (referenceCount === 0) {
    return null;
  }

  if (input.error) {
    return {
      affectedReferenceCount: referenceCount,
      description: `${formatReferenceCount(
        referenceCount,
      )} could not be verified. Preview may show unresolved media:// references.`,
      message: input.error,
      type: "error",
    };
  }

  if (input.isLoading) {
    return {
      affectedReferenceCount: referenceCount,
      description:
        "Publishing is blocked until referenced media has been verified for preview rendering.",
      message: `Resolving ${formatReferenceCount(referenceCount)}...`,
      type: "info",
    };
  }

  const issues = readMediaReferenceResolutionIssues(input.references, {
    mediaTypesByReference: input.mediaTypesByReference,
    urlsByReference: input.urlsByReference,
  });

  if (issues.length === 0) {
    return null;
  }

  const missingReferenceCount = countIssues(issues, "missing");
  const unsupportedReferenceCount = countIssues(issues, "unsupported_type");

  return {
    affectedReferenceCount: issues.length,
    description: formatResolutionIssues(issues),
    message: `${formatReferenceCount(issues.length)} ${
      issues.length === 1 ? "needs" : "need"
    } review.`,
    missingReferenceCount,
    type: "warning",
    unsupportedReferenceCount,
  };
}

function countUniqueReferences(references: MediaAssetReference[]): number {
  return new Set(references).size;
}

function countIssues(
  issues: MediaReferenceResolutionIssue[],
  reason: MediaReferenceResolutionIssue["reason"],
): number {
  return issues.filter((issue) => issue.reason === reason).length;
}

function formatReferenceCount(count: number): string {
  return `${count} media reference${count === 1 ? "" : "s"}`;
}

function formatResolutionIssues(
  issues: MediaReferenceResolutionIssue[],
): string {
  return [
    formatMissingReferences(issues),
    formatUnsupportedReferences(issues),
  ]
    .filter(Boolean)
    .join(" ");
}

function formatMissingReferences(
  issues: MediaReferenceResolutionIssue[],
): string {
  const references = issues
    .filter((issue) => issue.reason === "missing")
    .map((issue) => issue.reference);

  return formatReferenceList("Missing references", references);
}

function formatUnsupportedReferences(
  issues: MediaReferenceResolutionIssue[],
): string {
  const references = issues
    .filter((issue) => issue.reason === "unsupported_type")
    .map((issue) => `${issue.reference} (${issue.assetType ?? "unknown"})`);

  return formatReferenceList("Unsupported media types", references);
}

function formatReferenceList(label: string, references: string[]): string {
  if (references.length === 0) {
    return "";
  }

  const visibleReferences = references.slice(0, 3).join(", ");
  const remainingCount = references.length - 3;

  if (remainingCount <= 0) {
    return `${label}: ${visibleReferences}.`;
  }

  return `${label}: ${visibleReferences}, and ${remainingCount} more.`;
}
