import { isUnsafeProductionHostname } from "./production-url.js";

export type SiteDomainIssue =
  | "empty"
  | "too-long"
  | "protocol"
  | "url-parts"
  | "invalid-host"
  | "unsafe-host";

export const storefrontHostHeaderName = "x-storefront-host";

const siteDomainIssueMessages: Record<SiteDomainIssue, string> = {
  empty: "Domain is required.",
  "invalid-host": "Domain must be a valid hostname.",
  protocol: "Domain must not include a protocol.",
  "too-long": "Domain must be 255 characters or fewer.",
  "unsafe-host": "Domain must use localhost or a public hostname.",
  "url-parts": "Domain must not include paths, query strings, or spaces.",
};

export function normalizeSiteDomain(value: string): string {
  return stripDefaultPort(value.trim().toLowerCase());
}

export function readSiteDomainHeader(
  value: readonly string[] | string | null | undefined,
): string | null {
  const raw = readSingleHeaderValue(value);

  if (!raw || hasUnsafeHeaderValueCharacter(raw)) {
    return null;
  }

  const normalized = normalizeSiteDomain(raw);
  return readSiteDomainIssue(normalized) ? null : normalized;
}

export function readSiteDomainIssue(value: string): SiteDomainIssue | null {
  const normalized = normalizeSiteDomain(value);

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

  if (!isValidSiteHostname(host)) {
    return "invalid-host";
  }

  if (host !== "localhost" && isUnsafeProductionHostname(host)) {
    return "unsafe-host";
  }

  return null;
}

export function readSiteDomainIssueMessage(issue: SiteDomainIssue): string {
  return siteDomainIssueMessages[issue];
}

export function readSiteDomainValidationError(value: string): string | null {
  const issue = readSiteDomainIssue(value);
  return issue ? readSiteDomainIssueMessage(issue) : null;
}

function isValidSiteHostname(host: string): boolean {
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

function isValidPort(value: string): boolean {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 && parsed <= 65535;
}

function readSingleHeaderValue(
  value: readonly string[] | string | null | undefined,
): string | null {
  if (Array.isArray(value)) {
    return value.length === 1 ? value[0]?.trim() || null : null;
  }

  if (typeof value !== "string") {
    return null;
  }

  return value?.trim() || null;
}

function hasUnsafeHeaderValueCharacter(value: string): boolean {
  return Array.from(value).some((character) => {
    const codePoint = character.codePointAt(0) ?? 0;

    return codePoint <= 0x1f || codePoint === 0x7f || character === ",";
  });
}

function stripDefaultPort(value: string): string {
  const [host, port, extra] = value.split(":");

  if (!host || extra !== undefined) {
    return value;
  }

  return port === "80" || port === "443" ? host : value;
}
