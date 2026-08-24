import { redactApiMessageSecrets } from "../../lib/api-message-redaction.ts";

const auditMetadataDisplayMaxLength = 4_000;
const auditMetadataDisplayTruncatedSuffix = "\n[metadata truncated]";

export function formatAuditMetadata(metadata: unknown): string {
  const formatted = redactApiMessageSecrets(stringifyAuditMetadata(metadata));

  if (formatted.length <= auditMetadataDisplayMaxLength) {
    return formatted;
  }

  return `${formatted.slice(
    0,
    auditMetadataDisplayMaxLength,
  )}${auditMetadataDisplayTruncatedSuffix}`;
}

function stringifyAuditMetadata(metadata: unknown): string {
  try {
    return JSON.stringify(metadata ?? {}, null, 2);
  } catch {
    return "{}";
  }
}
