export function readPreviewTokenParam(
  value: string | string[] | undefined,
): string | null {
  if (typeof value !== "string") {
    return null;
  }

  return value;
}
