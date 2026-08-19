import {
  MEDIA_MAX_UPLOAD_BYTES,
  mediaAllowedMimeTypes,
} from "./constants.ts";

export { MEDIA_MAX_UPLOAD_BYTES };
export const mediaMaxUploadSizeLabel = "25 MB";

export function readMediaUploadFileError(file: {
  name?: string;
  size: number;
  type: string;
}): string | null {
  const mimeType = file.type.trim().toLowerCase();

  if (!mediaAllowedMimeTypes.includes(mimeType)) {
    return "File type is not allowed. Use AVIF, GIF, JPEG, PNG, WebP, MP4, or PDF.";
  }

  if (file.size < 1) {
    return "File is empty.";
  }

  if (file.size > MEDIA_MAX_UPLOAD_BYTES) {
    return `File must be ${mediaMaxUploadSizeLabel} or smaller.`;
  }

  return null;
}
