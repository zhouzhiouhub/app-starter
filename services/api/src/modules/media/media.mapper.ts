import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import type {
  MediaAssetResponse,
  MediaAssetType,
} from "./media.types.js";
import {
  readArchivedAt,
  readMediaMetadata,
  readMediaStatus,
} from "./media.metadata.js";

export function inferMediaAssetType(mimeType: string): MediaAssetType {
  if (mimeType.startsWith("image/")) {
    return "image";
  }

  if (mimeType.startsWith("video/")) {
    return "video";
  }

  if (mimeType === "application/pdf") {
    return "pdf";
  }

  return "other";
}

export function createMediaR2Key(input: {
  filename: string;
  now?: Date;
  tenantId: string;
}): string {
  const now = input.now ?? new Date();
  const datePath = now.toISOString().slice(0, 10).replaceAll("-", "/");
  return `${input.tenantId}/${datePath}/${randomUUID()}-${sanitizeFilename(
    input.filename,
  )}`;
}

export function toMediaAssetResponse(asset: {
  id: string;
  type: string;
  filename: string;
  url: string;
  r2Key: string;
  size: bigint | number;
  mimeType: string;
  metadata: Prisma.JsonValue;
  createdAt: Date;
}): MediaAssetResponse {
  return {
    id: asset.id,
    type: normalizeMediaType(asset.type),
    filename: asset.filename,
    url: asset.url,
    reference: `media://${asset.id}`,
    status: readMediaStatus(asset.metadata),
    archivedAt: readArchivedAt(asset.metadata),
    r2Key: asset.r2Key,
    size: Number(asset.size),
    mimeType: asset.mimeType,
    metadata: readMediaMetadata(asset.metadata),
    createdAt: asset.createdAt.toISOString(),
  };
}

function normalizeMediaType(type: string): MediaAssetType {
  if (type === "image" || type === "video" || type === "pdf") {
    return type;
  }

  return "other";
}

function sanitizeFilename(filename: string): string {
  const sanitized = filename
    .trim()
    .replace(/[/\\]+/g, "-")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);

  return sanitized || "asset";
}
