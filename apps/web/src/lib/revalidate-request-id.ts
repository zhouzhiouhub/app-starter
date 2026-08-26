const fallbackRevalidateRequestId = "local-dev";
const maxRevalidateRequestIdLength = 128;
const revalidateRequestIdPattern = /^[A-Za-z0-9._:-]+$/;

export function readRevalidateRequestId(value: string | null): string {
  if (value && hasControlCharacter(value)) {
    return fallbackRevalidateRequestId;
  }

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

function hasControlCharacter(value: string): boolean {
  return Array.from(value).some((character) => {
    const codePoint = character.codePointAt(0) ?? 0;

    return codePoint <= 0x1f || codePoint === 0x7f;
  });
}
