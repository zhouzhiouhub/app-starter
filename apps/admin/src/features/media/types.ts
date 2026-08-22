export type MediaAssetType = "image" | "video" | "pdf" | "other";
export type MediaAssetStatus = "active" | "archived";
export type MediaAssetListStatus = MediaAssetStatus | "all";

export interface MediaAsset {
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
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface MediaListMeta {
  page: number;
  limit: number;
  total: number;
}

export interface RegisterMediaInput {
  filename: string;
  mimeType: string;
  size: number;
  altText?: string;
  url: string;
}

export interface MediaUploadTarget {
  uploadUrl: string;
  method: "PUT";
  r2Key: string;
  type: MediaAssetType;
  headers: Record<string, string>;
  maxSize: number;
  expiresAt: string;
  confirmPath: string;
}

export interface UploadMediaFileInput {
  altText?: string;
  file: File;
}
