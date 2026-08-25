import type { MediaAssetReference } from "@app-starter/schema";

export function readMissingMediaReferences(
  references: MediaAssetReference[],
  urlsByReference: Record<string, string>,
): MediaAssetReference[] {
  const seen = new Set<MediaAssetReference>();
  const missingReferences: MediaAssetReference[] = [];

  for (const reference of references) {
    if (seen.has(reference) || urlsByReference[reference]) {
      continue;
    }

    seen.add(reference);
    missingReferences.push(reference);
  }

  return missingReferences;
}

export function createMediaReferenceSetKey(
  references: MediaAssetReference[],
): string {
  return [...new Set(references)].sort().join("\n");
}
