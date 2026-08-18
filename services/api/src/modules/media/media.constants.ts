export const MEDIA_MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
export const MEDIA_UPLOAD_URL_TTL_SECONDS = 15 * 60;

export const MEDIA_ALLOWED_MIME_TYPES = [
  "image/avif",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
  "application/pdf",
] as const;

export const DEFAULT_MEDIA_UPLOAD_BASE_URL = "https://uploads.local.invalid";
export const DEFAULT_MEDIA_CDN_BASE_URL = "https://cdn.local.invalid";
