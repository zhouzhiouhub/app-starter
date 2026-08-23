export const MEDIA_FILENAME_MAX_LENGTH = 255;

export function readMediaFilenameError(
  value: string | undefined,
): string | null {
  const filename = value?.trim() ?? "";

  if (!filename) {
    return "Enter a filename.";
  }

  if (filename.length > MEDIA_FILENAME_MAX_LENGTH) {
    return `Filename must be ${MEDIA_FILENAME_MAX_LENGTH} characters or fewer.`;
  }

  if (/[\\/\0]/.test(filename)) {
    return "Filename cannot contain slashes.";
  }

  return null;
}
