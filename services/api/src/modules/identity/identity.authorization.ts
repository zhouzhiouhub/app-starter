const maxBearerTokenLength = 4096;
const bearerTokenPattern = /^[A-Za-z0-9._-]+$/;

export function readBearerToken(
  authorization: string | undefined,
): string | undefined {
  if (!authorization) {
    return undefined;
  }

  const parts = authorization.trim().split(/\s+/);

  if (parts.length !== 2) {
    return undefined;
  }

  const [scheme, token] = parts;

  if (!scheme || !token || scheme.toLowerCase() !== "bearer") {
    return undefined;
  }

  if (
    token.length > maxBearerTokenLength ||
    !bearerTokenPattern.test(token) ||
    hasControlCharacter(token)
  ) {
    return undefined;
  }

  return token;
}

function hasControlCharacter(value: string): boolean {
  return Array.from(value).some((character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    return codePoint <= 0x1f || codePoint === 0x7f;
  });
}
