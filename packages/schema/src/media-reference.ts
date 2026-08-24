import { z } from "zod";

export const mediaAssetReferenceSchema = z
  .string()
  .regex(
    /^media:\/\/[a-zA-Z0-9][a-zA-Z0-9._-]*$/,
    "Media reference must look like media://asset-id",
  );
export type MediaAssetReference = z.infer<typeof mediaAssetReferenceSchema>;
export const pageMediaReferenceMaxCount = 200;

type CollectMediaReferencesOptions = {
  maxCount?: number;
};

export function isMediaAssetReference(
  value: string,
): value is MediaAssetReference {
  return mediaAssetReferenceSchema.safeParse(value).success;
}

export function readMediaAssetId(reference: string): string | null {
  if (!isMediaAssetReference(reference)) {
    return null;
  }

  return reference.slice("media://".length);
}

export function collectMediaReferences(
  value: unknown,
  options: CollectMediaReferencesOptions = {},
): MediaAssetReference[] {
  const references = new Set<MediaAssetReference>();
  collect(value, references, normalizeMaxCount(options.maxCount));
  return [...references];
}

export function resolveMediaReferences<T>(
  value: T,
  resolve: (reference: MediaAssetReference) => string,
): T {
  if (typeof value === "string") {
    return (isMediaAssetReference(value) ? resolve(value) : value) as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => resolveMediaReferences(item, resolve)) as T;
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, child]) => [
      key,
      resolveMediaReferences(child, resolve),
    ]),
  ) as T;
}

function collect(
  value: unknown,
  references: Set<MediaAssetReference>,
  maxCount: number | null,
): boolean {
  if (maxCount !== null && references.size >= maxCount) {
    return true;
  }

  if (typeof value === "string") {
    if (isMediaAssetReference(value)) {
      references.add(value);
    }

    return maxCount !== null && references.size >= maxCount;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      if (collect(item, references, maxCount)) {
        return true;
      }
    }

    return false;
  }

  if (!value || typeof value !== "object") {
    return false;
  }

  for (const child of Object.values(value)) {
    if (collect(child, references, maxCount)) {
      return true;
    }
  }

  return false;
}

function normalizeMaxCount(value: number | undefined): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return Math.max(0, Math.floor(value));
}
