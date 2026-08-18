export type MediaAssetType = "image" | "video" | "pdf" | "other";
export type MediaAssetStatus = "active" | "archived";

export type MediaMetadata = Record<string, unknown>;

export type MediaAssetResponse = {
  id: string;
  type: MediaAssetType;
  filename: string;
  url: string;
  reference: string;
  status: MediaAssetStatus;
  archivedAt: string | null;
  r2Key: string;
  size: number;
  mimeType: string;
  metadata: MediaMetadata;
  createdAt: string;
};

export type MediaUploadUrlResponse = {
  uploadUrl: string;
  method: "PUT";
  r2Key: string;
  type: MediaAssetType;
  headers: Record<string, string>;
  maxSize: number;
  expiresAt: string;
  confirmPath: string;
};
