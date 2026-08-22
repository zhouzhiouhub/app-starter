const fallbackRevalidateRequestId = "local-dev";
const maxRevalidateRequestIdLength = 128;
const revalidateRequestIdPattern = /^[A-Za-z0-9._:-]+$/;

export function readRevalidateRequestId(value: string | null): string {
  const candidate = value?.trim();

  if (
    !candidate ||
    candidate.length > maxRevalidateRequestIdLength ||
    !revalidateRequestIdPattern.test(candidate)
  ) {
    return fallbackRevalidateRequestId;
  }

  return candidate;
}
