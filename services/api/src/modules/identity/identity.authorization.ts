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

  return token;
}
