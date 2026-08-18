import { generateKeyPairSync, type KeyObject } from "node:crypto";
import { importPKCS8, importSPKI } from "jose";
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

  if (privatePem && publicPem) {
    cachedKeys = {
      generated: false,
      privateKey: await importPKCS8(privatePem, JWT_ALGORITHM),
      publicKey: await importSPKI(publicPem, JWT_ALGORITHM),
    };
    return cachedKeys;
  }

  if ((process.env.NODE_ENV ?? "development") === "production") {
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

export function resetJwtKeysForTests(): void {
  cachedKeys = undefined;
}

function normalizePem(value: string | undefined): string | undefined {
  const trimmed = value?.trim();

  if (!trimmed) {
    return undefined;
  }

  return trimmed.includes("\\n") ? trimmed.replace(/\\n/g, "\n") : trimmed;
}
