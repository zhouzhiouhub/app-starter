import { createPrivateKey, createPublicKey, sign, verify } from "node:crypto";

const jwtPrivateKeyLabel = "PRIVATE KEY";
const jwtPublicKeyLabel = "PUBLIC KEY";
const jwtKeyCanaryPayload = Buffer.from("app-starter-jwt-key-check");

export function createIdentityDiagnostics(env = process.env) {
  const privatePem = normalizePem(env.JWT_PRIVATE_KEY);
  const publicPem = normalizePem(env.JWT_PUBLIC_KEY);
  const privateKey = readPemDiagnostic(privatePem, jwtPrivateKeyLabel);
  const publicKey = readPemDiagnostic(publicPem, jwtPublicKeyLabel);
  const pair = readJwtPairDiagnostic(privatePem, publicPem, {
    privateKey,
    publicKey,
  });

  return {
    jwt: {
      configured: privateKey.configured && publicKey.configured,
      pair,
      privateKey,
      productionReady: privateKey.valid && publicKey.valid && pair.valid,
      publicKey,
    },
  };
}

function readPemDiagnostic(normalized, label) {
  const configured = Boolean(normalized);

  return {
    configured,
    issue: configured && !hasPemShape(normalized, label) ? "invalid-pem" : null,
    valid: configured && hasPemShape(normalized, label),
  };
}

function readJwtPairDiagnostic(privatePem, publicPem, diagnostics) {
  const keysReady =
    diagnostics.privateKey.valid === true && diagnostics.publicKey.valid === true;

  if (!keysReady) {
    return {
      checked: false,
      issue: null,
      valid: false,
    };
  }

  try {
    const privateKey = createPrivateKey(privatePem);
    const publicKey = createPublicKey(publicPem);
    const signature = sign("RSA-SHA256", jwtKeyCanaryPayload, privateKey);
    const valid = verify(
      "RSA-SHA256",
      jwtKeyCanaryPayload,
      publicKey,
      signature,
    );

    return {
      checked: true,
      issue: valid ? null : "mismatched-key-pair",
      valid,
    };
  } catch {
    return {
      checked: true,
      issue: "invalid-key-pair",
      valid: false,
    };
  }
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
