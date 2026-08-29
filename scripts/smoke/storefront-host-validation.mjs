import { isUnsafeProductionHostname } from "./production-hostname-validation.mjs";

export function readSafeStorefrontHost(value) {
  const raw = readSingleHostValue(value);

  if (!raw) {
    return null;
  }

  const normalized = normalizeStorefrontHostValue(raw);
  return readStorefrontHostIssue(normalized) ? null : normalized;
}

export function normalizeSafeStorefrontHost(value) {
  const host = readSafeStorefrontHost(value);

  if (!host) {
    throw new Error(
      "SMOKE_STOREFRONT_HOST must be a safe storefront host without protocol, path, query, or fragment.",
    );
  }

  return host;
}

export function normalizeStorefrontHostValue(value) {
  return stripDefaultPort(value.trim().toLowerCase());
}

export function readStorefrontHostIssue(value) {
  const normalized = normalizeStorefrontHostValue(value);

  if (!normalized) {
    return "empty";
  }

  if (normalized.length > 255) {
    return "too-long";
  }

  if (/^https?:\/\//.test(normalized)) {
    return "protocol";
  }

  if (/[/?#\\\s]/.test(normalized)) {
    return "url-parts";
  }

  const [host, port, extra] = normalized.split(":");

  if (!host || extra !== undefined) {
    return "invalid-host";
  }

  if (port !== undefined && !isValidPort(port)) {
    return "invalid-host";
  }

  if (!isValidStorefrontHostname(host)) {
    return "invalid-host";
  }

  if (host !== "localhost" && isUnsafeProductionHostname(host)) {
    return "unsafe-host";
  }

  return null;
}

function isValidStorefrontHostname(host) {
  if (host === "localhost") {
    return true;
  }

  if (host.length > 253 || host.startsWith(".") || host.endsWith(".")) {
    return false;
  }

  return host
    .split(".")
    .every((label) => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label));
}

function isValidPort(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 && parsed <= 65535;
}

function readSingleHostValue(value) {
  if (Array.isArray(value)) {
    return value.length === 1 ? readSingleHostStringValue(value[0]) : null;
  }

  if (typeof value !== "string") {
    return null;
  }

  return readSingleHostStringValue(value);
}

function readSingleHostStringValue(value) {
  if (!value || hasUnsafeHeaderValueCharacter(value)) {
    return null;
  }

  return value.trim() || null;
}

function hasUnsafeHeaderValueCharacter(value) {
  return Array.from(value).some((character) => {
    const codePoint = character.codePointAt(0) ?? 0;

    return codePoint <= 0x1f || codePoint === 0x7f || character === ",";
  });
}

function stripDefaultPort(value) {
  const [host, port, extra] = value.split(":");

  if (!host || extra !== undefined) {
    return value;
  }

  return port === "80" || port === "443" ? host : value;
}
