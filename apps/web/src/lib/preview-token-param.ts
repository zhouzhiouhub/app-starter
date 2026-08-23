const maxPreviewTokenLength = 2048;
const previewTokenPattern = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{43}$/;

export function readPreviewTokenParam(
  value: string | string[] | undefined,
): string | null {
  return typeof value === "string" && isPreviewTokenCandidate(value)
    ? value
    : null;
}

export function isPreviewTokenCandidate(token: string): boolean {
  return (
    token.length <= maxPreviewTokenLength &&
    token.trim() === token &&
    previewTokenPattern.test(token)
  );
}
