import {
  normalizeSiteDomain,
  readProductionHostnameIssue,
  readSiteDomainHeader,
  storefrontHostHeaderName,
} from "@app-starter/schema";

const storefrontHostCacheParamName = "storefrontHost";

export function readForwardableStorefrontHost(
  storefrontHost?: string | null,
): string | null {
  return (
    readSiteDomainHeader(storefrontHost) ??
    readPlaceholderStorefrontHost(storefrontHost)
  );
}

export function createStorefrontHostHeaders(
  storefrontHost?: string | null,
): HeadersInit | undefined {
  const host = readForwardableStorefrontHost(storefrontHost);

  return host ? { [storefrontHostHeaderName]: host } : undefined;
}

export function addStorefrontHostCacheParam(
  searchParams: URLSearchParams,
  storefrontHost?: string | null,
): URLSearchParams {
  const host = readForwardableStorefrontHost(storefrontHost);

  if (host) {
    searchParams.set(storefrontHostCacheParamName, host);
  }

  return searchParams;
}

function readPlaceholderStorefrontHost(value?: string | null): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const rawValue = value.trim();

  if (!rawValue || hasUnsafeHeaderCharacter(rawValue)) {
    return null;
  }

  const normalized = normalizeSiteDomain(rawValue);
  const [host, port, extra] = normalized.split(":");

  if (!host || extra !== undefined || !isValidOptionalPort(port)) {
    return null;
  }

  return readProductionHostnameIssue(host) === "placeholder-host"
    ? normalized
    : null;
}

function isValidOptionalPort(port: string | undefined): boolean {
  if (port === undefined) {
    return true;
  }

  const parsed = Number(port);
  return Number.isInteger(parsed) && parsed > 0 && parsed <= 65535;
}

function hasUnsafeHeaderCharacter(value: string): boolean {
  return Array.from(value).some((character) => {
    const code = character.charCodeAt(0);
    return code <= 31 || code === 127 || character === ",";
  });
}
