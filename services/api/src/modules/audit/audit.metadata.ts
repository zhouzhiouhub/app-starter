import type { Prisma } from "@prisma/client";
import { redactLogSecrets } from "../../common/log-redaction.js";

const redactedValue = "[redacted]";
const truncatedValue = "[truncated]";
const maxAuditMetadataArrayItems = 50;
const maxAuditMetadataDepth = 6;
const maxAuditMetadataObjectEntries = 50;
const maxAuditMetadataStringLength = 1_000;
const metadataTruncatedKey = "__metadataTruncated";
const sensitiveMetadataKeys = new Set([
  "accesskeyid",
  "accesstoken",
  "apikey",
  "authorization",
  "authcode",
  "authorizationcode",
  "clientsecret",
  "codeverifier",
  "connectionstring",
  "cookie",
  "credential",
  "databaseurl",
  "dsn",
  "idtoken",
  "jwt",
  "oauthcode",
  "oauthverifier",
  "password",
  "passphrase",
  "pem",
  "privatekey",
  "refreshtoken",
  "schema",
  "secret",
  "secretaccesskey",
  "session",
  "sessionid",
  "setcookie",
  "signature",
  "token",
]);

export function sanitizeAuditMetadata(value: unknown): unknown {
  const sanitized = sanitizeAuditMetadataValue(value);
  return sanitized ?? {};
}

export function sanitizeAuditMetadataForStorage(
  value: Record<string, unknown> | undefined,
): Prisma.InputJsonValue {
  return sanitizeAuditMetadataValue(value ?? {}) as Prisma.InputJsonValue;
}

function sanitizeAuditMetadataValue(value: unknown): unknown {
  return sanitizeAuditMetadataValueAtDepth(value, 0);
}

function sanitizeAuditMetadataValueAtDepth(
  value: unknown,
  depth: number,
): unknown {
  if (Array.isArray(value)) {
    if (depth >= maxAuditMetadataDepth) {
      return truncatedValue;
    }

    const items = value
      .slice(0, maxAuditMetadataArrayItems)
      .map((item) => sanitizeAuditMetadataValueAtDepth(item, depth + 1));
    const remainingCount = value.length - items.length;

    return remainingCount > 0
      ? [...items, `${truncatedValue}: ${remainingCount} more item(s)`]
      : items;
  }

  if (!value || typeof value !== "object") {
    return isJsonPrimitive(value) ? sanitizeAuditMetadataPrimitive(value) : null;
  }

  if (depth >= maxAuditMetadataDepth) {
    return truncatedValue;
  }

  const entries = Object.entries(value as Record<string, unknown>);
  const visibleEntries = entries.slice(0, maxAuditMetadataObjectEntries);
  const sanitized = Object.fromEntries(
    visibleEntries.map(([key, child]) => [
      key,
      shouldRedactMetadataKey(key)
        ? redactedValue
        : sanitizeAuditMetadataValueAtDepth(child, depth + 1),
    ]),
  );
  const remainingCount = entries.length - visibleEntries.length;

  if (remainingCount > 0) {
    sanitized[metadataTruncatedKey] =
      `${truncatedValue}: ${remainingCount} more field(s)`;
  }

  return sanitized;
}

function shouldRedactMetadataKey(key: string): boolean {
  const normalized = key.replace(/[-_]/g, "").toLowerCase();

  return (
    sensitiveMetadataKeys.has(normalized) ||
    normalized.endsWith("accesskeyid") ||
    normalized.endsWith("apikey") ||
    normalized.endsWith("authcode") ||
    normalized.endsWith("authorizationcode") ||
    normalized.endsWith("clientsecret") ||
    normalized.endsWith("codeverifier") ||
    normalized.endsWith("connectionstring") ||
    normalized.endsWith("credential") ||
    normalized.endsWith("cookie") ||
    normalized.endsWith("databaseurl") ||
    normalized.endsWith("dsn") ||
    normalized.endsWith("idtoken") ||
    normalized.endsWith("jwt") ||
    normalized.endsWith("oauthcode") ||
    normalized.endsWith("oauthverifier") ||
    normalized.endsWith("password") ||
    normalized.endsWith("passphrase") ||
    normalized.endsWith("pem") ||
    normalized.endsWith("privatekey") ||
    normalized.endsWith("secret") ||
    normalized.endsWith("secretaccesskey") ||
    normalized.endsWith("session") ||
    normalized.endsWith("sessionid") ||
    normalized.endsWith("signature") ||
    normalized.endsWith("token")
  );
}

function isJsonPrimitive(value: unknown): value is string | number | boolean {
  return (
    typeof value === "string" ||
    (typeof value === "number" && Number.isFinite(value)) ||
    typeof value === "boolean"
  );
}

function sanitizeAuditMetadataPrimitive(
  value: string | number | boolean,
): string | number | boolean {
  if (typeof value !== "string") {
    return value;
  }

  const redacted = redactLogSecrets(value);

  return redacted.length > maxAuditMetadataStringLength
    ? `${redacted.slice(0, maxAuditMetadataStringLength)}${truncatedValue}`
    : redacted;
}
