import type { Prisma } from "@prisma/client";
import type { MediaAssetStatus, MediaMetadata } from "./media.types.js";

export function readMediaMetadata(metadata: Prisma.JsonValue): MediaMetadata {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return {};
  }

  return metadata as MediaMetadata;
}

export function readArchivedAt(metadata: Prisma.JsonValue): string | null {
  const record = readMediaMetadata(metadata);
  return typeof record.archivedAt === "string" ? record.archivedAt : null;
}

export function readMediaStatus(metadata: Prisma.JsonValue): MediaAssetStatus {
  return readArchivedAt(metadata) ? "archived" : "active";
}

export function writeArchiveMetadata(input: {
  actorId: string;
  metadata: Prisma.JsonValue;
  now?: Date;
}): Prisma.InputJsonValue {
  return {
    ...readMediaMetadata(input.metadata),
    archivedAt: (input.now ?? new Date()).toISOString(),
    archivedBy: input.actorId,
  } as Prisma.InputJsonValue;
}
