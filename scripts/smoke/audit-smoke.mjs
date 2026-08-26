import { fetchJson, readHttpError } from "./http-json-smoke.mjs";
import { redactSmokeSecrets } from "./smoke-secrets.mjs";

const defaultAuditActions = ["preview_token.created", "page.published"];
const maxAuditErrorIdentifierLength = 120;
const maxAuditErrorLabelLength = 160;
const maxAuditErrorMessageLength = 420;

export async function assertAuditLogs(
  input,
  accessToken,
  pageId,
  actions = defaultAuditActions,
) {
  for (const action of actions) {
    await assertAuditLog(input, accessToken, {
      action,
      label: `${action} audit log`,
      pageId,
    });
  }

  console.log("Audit log checks passed.");
}

export function isPageAuditLog(log, options) {
  const metadata = readAuditMetadata(log);

  return (
    log &&
    typeof log === "object" &&
    log.action === options.action &&
    log.targetId === options.pageId &&
    log.targetType === "page" &&
    metadata.slug === options.slug &&
    !hasUnsafeAuditMetadata(metadata)
  );
}

export function hasUnsafeAuditMetadata(value) {
  if (typeof value === "string") {
    return redactSmokeSecrets(value) !== value;
  }

  if (Array.isArray(value)) {
    return value.some((item) => hasUnsafeAuditMetadata(item));
  }

  if (!value || typeof value !== "object") {
    return false;
  }

  return Object.entries(value).some(([key, child]) => {
    const normalized = key.replace(/[-_]/g, "").toLowerCase();

    return (
      normalized === "token" ||
      normalized === "schema" ||
      normalized.endsWith("secret") ||
      normalized.endsWith("token") ||
      normalized.endsWith("password") ||
      hasUnsafeAuditMetadata(child)
    );
  });
}

async function assertAuditLog(input, accessToken, options) {
  const response = await fetchJson(
    `${input.apiBaseUrl}/audit-logs?${buildAuditQuery(options)}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      method: "GET",
    },
  );

  if (!response.ok) {
    const label = formatAuditErrorText(
      options.label,
      "Audit log",
      maxAuditErrorLabelLength,
    );

    throw new Error(
      readHttpError(response, `${label} request failed.`),
    );
  }

  const logs = Array.isArray(response.body?.data) ? response.body.data : [];
  const found = logs.find((log) =>
    isPageAuditLog(log, {
      action: options.action,
      pageId: options.pageId,
      slug: input.slug,
    }),
  );

  if (!found) {
    const diagnostic = readPageAuditLogDiagnostic(response.body?.data, {
      action: options.action,
      pageId: options.pageId,
      slug: input.slug,
    });

    throw new Error(formatMissingAuditLogError(options, diagnostic));
  }
}

export function readPageAuditLogDiagnostic(value, options) {
  const logs = Array.isArray(value) ? value : [];

  return {
    actionMatches: logs.filter((log) => log?.action === options.action).length,
    dataType: readDataType(value),
    itemCount: logs.length,
    slugMatches: logs.filter(
      (log) => readAuditMetadata(log).slug === options.slug,
    ).length,
    targetIdMatches: logs.filter((log) => log?.targetId === options.pageId)
      .length,
    targetTypeMatches: logs.filter((log) => log?.targetType === "page").length,
    unsafeMetadataCount: logs.filter((log) =>
      hasUnsafeAuditMetadata(readAuditMetadata(log)),
    ).length,
    validMatches: logs.filter((log) => isPageAuditLog(log, options)).length,
  };
}

export function formatPageAuditLogDiagnostic(diagnostic) {
  return `data: ${diagnostic.dataType}, items: ${diagnostic.itemCount}, action matches: ${diagnostic.actionMatches}, target id matches: ${diagnostic.targetIdMatches}, target type matches: ${diagnostic.targetTypeMatches}, slug matches: ${diagnostic.slugMatches}, unsafe metadata: ${diagnostic.unsafeMetadataCount}, valid matches: ${diagnostic.validMatches}`;
}

function buildAuditQuery(options) {
  return new URLSearchParams({
    action: options.action,
    limit: "20",
    page: "1",
    targetId: options.pageId,
    targetType: "page",
  }).toString();
}

function formatMissingAuditLogError(options, diagnostic) {
  const label = formatAuditErrorText(
    options.label,
    "Audit log",
    maxAuditErrorLabelLength,
  );
  const pageId = formatAuditErrorText(
    options.pageId,
    "unknown",
    maxAuditErrorIdentifierLength,
  );

  return formatAuditErrorText(
    `${label} was not found for page ${pageId} (${formatPageAuditLogDiagnostic(
      diagnostic,
    )}).`,
    "Audit log was not found.",
    maxAuditErrorMessageLength,
  );
}

function formatAuditErrorText(value, fallback, maxLength) {
  const text = typeof value === "string" && value.length > 0 ? value : fallback;

  return truncateText(
    normalizeAuditErrorText(redactSmokeSecrets(text)),
    maxLength,
  );
}

function normalizeAuditErrorText(value) {
  return replaceControlCharacters(value).replace(/\s+/g, " ").trim();
}

function replaceControlCharacters(value) {
  let result = "";

  for (const character of String(value)) {
    const code = character.charCodeAt(0);
    result += code <= 31 || code === 127 ? " " : character;
  }

  return result;
}

function truncateText(value, limit) {
  return value.length > limit ? `${value.slice(0, limit - 3)}...` : value;
}

function readDataType(value) {
  if (Array.isArray(value)) {
    return "array";
  }

  if (value === null) {
    return "null";
  }

  return typeof value;
}

function readAuditMetadata(log) {
  const metadata = log?.metadata;

  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return {};
  }

  return metadata;
}
