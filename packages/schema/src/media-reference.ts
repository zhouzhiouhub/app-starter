import { z } from "zod";

export const mediaAssetReferenceSchema = z
  .string()
  .regex(
    /^media:\/\/[a-zA-Z0-9][a-zA-Z0-9._-]*$/,
    "Media reference must look like media://asset-id",
  );
export type MediaAssetReference = z.infer<typeof mediaAssetReferenceSchema>;

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

export function collectMediaReferences(value: unknown): MediaAssetReference[] {
  const references = new Set<MediaAssetReference>();
  collect(value, references);
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
): void {
  if (typeof value === "string") {
    if (isMediaAssetReference(value)) {
      references.add(value);
    }

    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collect(item, references));
    return;
  }

  if (!value || typeof value !== "object") {
    return;
  }

  Object.values(value).forEach((child) => collect(child, references));
}
