import { createHash, timingSafeEqual } from "node:crypto";

const maxRevalidateSecretLength = 1024;

export function readConfiguredRevalidateSecret(
  env: Record<string, string | undefined> = process.env,
): string {
  const secret = readControlSafeSecret(env.STOREFRONT_REVALIDATE_SECRET);

  return isSafeRevalidateSecret(secret) ? secret : "";
}

export function hasValidRevalidateSecret(input: {
  configuredSecret: string;
  providedSecret: string | null;
}): boolean {
  const configuredSecret = readControlSafeSecret(input.configuredSecret);
  const providedSecret = input.providedSecret ?? "";

  if (
    !isSafeRevalidateSecret(configuredSecret) ||
    !isSafeRevalidateSecret(providedSecret)
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

function isSafeRevalidateSecret(value: string): boolean {
  return (
    value.length > 0 &&
    value.length <= maxRevalidateSecretLength &&
    value.trim() === value &&
    !hasControlCharacter(value)
  );
}

function readControlSafeSecret(value: string | undefined): string {
  if (!value || hasControlCharacter(value)) {
    return "";
  }

  return value;
}

function hasControlCharacter(value: string): boolean {
  return Array.from(value).some((character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    return codePoint <= 0x1f || codePoint === 0x7f;
  });
}
