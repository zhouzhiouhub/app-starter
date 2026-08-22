import { createHash, timingSafeEqual } from "node:crypto";

const maxRevalidateSecretLength = 4096;

export function readConfiguredRevalidateSecret(
  env: Record<string, string | undefined> = process.env,
): string {
  return env.STOREFRONT_REVALIDATE_SECRET?.trim() ?? "";
}

export function hasValidRevalidateSecret(input: {
  configuredSecret: string;
  providedSecret: string | null;
}): boolean {
  const configuredSecret = input.configuredSecret.trim();
  const providedSecret = input.providedSecret ?? "";

  if (
    !configuredSecret ||
    !providedSecret ||
    configuredSecret.length > maxRevalidateSecretLength ||
    providedSecret.length > maxRevalidateSecretLength
  ) {
    return false;
  }

  return timingSafeEqual(
    hashSecret(configuredSecret),
    hashSecret(providedSecret),
  );
}

function hashSecret(value: string): Buffer {
  return createHash("sha256").update(value, "utf8").digest();
}
