import type { MediaAssetReference } from "@app-starter/schema";
import type { MediaAssetType } from "./types";

export type MediaReferenceResolutionIssueReason =
  | "missing"
  | "unsupported_type";

export interface MediaReferenceResolutionIssue {
  assetType?: MediaAssetType;
  reason: MediaReferenceResolutionIssueReason;
  reference: MediaAssetReference;
}

export function readMissingMediaReferences(
  references: MediaAssetReference[],
  urlsByReference: Record<string, string>,
): MediaAssetReference[] {
  return readMediaReferenceResolutionIssues(references, {
    urlsByReference,
  })
    .filter((issue) => issue.reason === "missing")
    .map((issue) => issue.reference);
}

export function readMediaReferenceResolutionIssues(
  references: MediaAssetReference[],
  input: {
    mediaTypesByReference?: Record<string, MediaAssetType>;
    supportedTypes?: MediaAssetType[];
    urlsByReference: Record<string, string>;
  },
): MediaReferenceResolutionIssue[] {
  const seen = new Set<MediaAssetReference>();
  const issues: MediaReferenceResolutionIssue[] = [];
  const supportedTypes = new Set(input.supportedTypes ?? ["image"]);

  for (const reference of references) {
    if (seen.has(reference)) {
      continue;
    }

    seen.add(reference);
    const assetType = input.mediaTypesByReference?.[reference];

    if (assetType && !supportedTypes.has(assetType)) {
      issues.push({
        assetType,
        reason: "unsupported_type",
        reference,
      });
      continue;
    }

    if (!input.urlsByReference[reference]) {
      issues.push({
        reason: "missing",
        reference,
      });
    }
  }

  return issues;
}

export function createMediaReferenceSetKey(
  references: MediaAssetReference[],
): string {
  return [...new Set(references)].sort().join("\n");
}
