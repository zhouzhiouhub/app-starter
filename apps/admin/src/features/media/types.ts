export type MediaAssetType = "image" | "video" | "pdf" | "other";

export interface MediaAsset {
  id: string;
  type: MediaAssetType;
  filename: string;
  url: string;
  reference: string;
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
  url: string;
  mimeType: string;
  size: number;
  altText?: string;
}
