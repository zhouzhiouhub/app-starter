const jwtPrivateKeyLabel = "PRIVATE KEY";
const jwtPublicKeyLabel = "PUBLIC KEY";

export function createIdentityDiagnostics(env = process.env) {
  const privateKey = readPemDiagnostic(env.JWT_PRIVATE_KEY, jwtPrivateKeyLabel);
  const publicKey = readPemDiagnostic(env.JWT_PUBLIC_KEY, jwtPublicKeyLabel);

  return {
    jwt: {
      configured: privateKey.configured && publicKey.configured,
      privateKey,
      productionReady: privateKey.valid && publicKey.valid,
      publicKey,
    },
  };
}

function readPemDiagnostic(value, label) {
  const normalized = normalizePem(value);
  const configured = Boolean(normalized);

  return {
    configured,
    issue: configured && !hasPemShape(normalized, label) ? "invalid-pem" : null,
    valid: configured && hasPemShape(normalized, label),
  };
}

function normalizePem(value) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return null;
  }

  return trimmed.replace(/\\n/g, "\n");
}

function hasPemShape(value, label) {
  return (
    value.includes(`-----BEGIN ${label}-----`) &&
    value.includes(`-----END ${label}-----`)
  );
}
