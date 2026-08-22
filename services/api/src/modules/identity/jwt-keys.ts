import { generateKeyPairSync, type KeyObject } from "node:crypto";
import { importPKCS8, importSPKI, jwtVerify, SignJWT } from "jose";
import { JWT_ALGORITHM } from "./identity.constants.js";

type JwtKey = KeyObject | CryptoKey;

export interface JwtKeyPair {
  generated: boolean;
  privateKey: JwtKey;
  publicKey: JwtKey;
}

let cachedKeys: JwtKeyPair | undefined;

export async function loadJwtKeys(): Promise<JwtKeyPair> {
  if (cachedKeys) {
    return cachedKeys;
  }

  const privatePem = normalizePem(process.env.JWT_PRIVATE_KEY);
  const publicPem = normalizePem(process.env.JWT_PUBLIC_KEY);

  if (privatePem || publicPem) {
    cachedKeys = await loadConfiguredJwtKeys(privatePem, publicPem);
    return cachedKeys;
  }

  if (isProductionJwtEnvironment()) {
    throw new Error(
      "JWT_PRIVATE_KEY and JWT_PUBLIC_KEY are required in production.",
    );
  }

  const pair = generateKeyPairSync("rsa", { modulusLength: 2048 });
  cachedKeys = {
    generated: true,
    privateKey: pair.privateKey,
    publicKey: pair.publicKey,
  };
  return cachedKeys;
}

async function loadConfiguredJwtKeys(
  privatePem: string | undefined,
  publicPem: string | undefined,
): Promise<JwtKeyPair> {
  if (!privatePem || !publicPem) {
    throw new Error(
      "JWT_PRIVATE_KEY and JWT_PUBLIC_KEY must be configured together.",
    );
  }

  try {
    const keys = {
      generated: false,
      privateKey: await importPKCS8(privatePem, JWT_ALGORITHM),
      publicKey: await importSPKI(publicPem, JWT_ALGORITHM),
    };
    await assertMatchingJwtKeyPair(keys);
    return keys;
  } catch {
    throw new Error(
      "JWT_PRIVATE_KEY and JWT_PUBLIC_KEY must be a valid matching RS256 key pair.",
    );
  }
}

async function assertMatchingJwtKeyPair(keys: JwtKeyPair): Promise<void> {
  const canaryToken = await new SignJWT({ purpose: "jwt-key-check" })
    .setProtectedHeader({ alg: JWT_ALGORITHM, typ: "JWT" })
    .setIssuedAt()
    .setExpirationTime("1m")
    .sign(keys.privateKey);

  await jwtVerify(canaryToken, keys.publicKey, {
    algorithms: [JWT_ALGORITHM],
  });
}

export function resetJwtKeysForTests(): void {
  cachedKeys = undefined;
}

export function isProductionJwtEnvironment(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return [env.NODE_ENV, env.APP_ENV, env.VERCEL_ENV].some(
    (value) => value?.trim().toLowerCase() === "production",
  );
}

function normalizePem(value: string | undefined): string | undefined {
  const trimmed = value?.trim();

  if (!trimmed) {
    return undefined;
  }

  return trimmed.includes("\\n") ? trimmed.replace(/\\n/g, "\n") : trimmed;
}
