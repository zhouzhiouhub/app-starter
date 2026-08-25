import { isUnsafeProductionHostname } from "@app-starter/schema";
import { DEFAULT_MEDIA_CDN_BASE_URL } from "./media.constants.js";
import { isProductionMediaEnvironment } from "./media.production-env.js";

export interface MediaUrlSource {
  hostname: string;
  pathPrefix: string;
  protocol: "http:" | "https:";
}

export function readAllowedMediaUrlHosts(
  env: Record<string, string | undefined> = process.env,
): Set<string> {
  return new Set([
    ...readExternalMediaUrlHosts(env),
    ...readManagedMediaUrlHosts(env),
  ]);
}

export function readAllowedMediaUrlSources(
  env: Record<string, string | undefined> = process.env,
): MediaUrlSource[] {
  return [
    ...readExternalMediaUrlSources(env),
    ...readManagedMediaUrlSources(env),
  ];
}

export function readExternalMediaUrlHosts(
  env: Record<string, string | undefined> = process.env,
): Set<string> {
  return new Set(
    readHostsFromList(env.MEDIA_EXTERNAL_URL_HOSTS, {
      rejectUnsafeProductionHost: isProductionMediaEnvironment(env),
      rejectUrlParts: true,
      requireHttps: true,
    }),
  );
}

export function readManagedMediaUrlHosts(
  env: Record<string, string | undefined> = process.env,
): Set<string> {
  return new Set(readManagedMediaUrlSources(env).map(({ hostname }) => hostname));
}

export function isAllowedMediaUrlSource(
  url: URL,
  source: MediaUrlSource,
): boolean {
  return (
    url.protocol === source.protocol &&
    url.hostname.toLowerCase() === source.hostname &&
    matchesPathPrefix(url.pathname, source.pathPrefix)
  );
}

function readExternalMediaUrlSources(
  env: Record<string, string | undefined> = process.env,
): MediaUrlSource[] {
  return [...readExternalMediaUrlHosts(env)].map((hostname) => ({
    hostname,
    pathPrefix: "",
    protocol: "https:",
  }));
}

function readManagedMediaUrlSources(
  env: Record<string, string | undefined> = process.env,
): MediaUrlSource[] {
  const rejectUnsafeProductionHost = isProductionMediaEnvironment(env);
  const urls = rejectUnsafeProductionHost
    ? [env.MEDIA_CDN_BASE_URL]
    : [env.MEDIA_CDN_BASE_URL, env.CDN_BASE_URL, DEFAULT_MEDIA_CDN_BASE_URL];

  return urls
    .map((url) =>
      readSafeSourceFromHttpUrl(url, {
        rejectUnsafeProductionHost,
        requireHttps: rejectUnsafeProductionHost,
      }),
    )
    .filter((source): source is MediaUrlSource => Boolean(source));
}

function readHostsFromList(
  value: string | undefined,
  options: {
    rejectUnsafeProductionHost?: boolean;
    rejectUrlParts?: boolean;
    requireHttps?: boolean;
  },
): string[] {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((item) => readHostFromUrlOrHost(item, options))
    .filter((host): host is string => Boolean(host));
}

function readHostFromUrlOrHost(
  value: string,
  options: {
    rejectUnsafeProductionHost?: boolean;
    rejectUrlParts?: boolean;
    requireHttps?: boolean;
  },
): string | undefined {
  const trimmed = readControlSafeTrimmedValue(value);

  if (!trimmed) {
    return undefined;
  }

  return (
    readSafeHostFromHttpUrl(trimmed, options) ??
    readHostFromBareValue(trimmed, options)
  );
}

function readSafeHostFromHttpUrl(
  value: string | undefined,
  options: {
    rejectUnsafeProductionHost?: boolean;
    rejectUrlParts?: boolean;
    requireHttps?: boolean;
  },
): string | undefined {
  return readSafeSourceFromHttpUrl(value, options)?.hostname;
}

function readSafeSourceFromHttpUrl(
  value: string | undefined,
  options: {
    rejectUnsafeProductionHost?: boolean;
    rejectUrlParts?: boolean;
    requireHttps?: boolean;
  },
): MediaUrlSource | undefined {
  const trimmed = readControlSafeTrimmedValue(value);

  if (!trimmed) {
    return undefined;
  }

  try {
    const url = new URL(trimmed);

    if (
      !["http:", "https:"].includes(url.protocol) ||
      (options.requireHttps && url.protocol !== "https:") ||
      (options.rejectUnsafeProductionHost &&
        isUnsafeProductionHostname(url.hostname)) ||
      url.username ||
      url.password ||
      (options.rejectUrlParts && trimTrailingSlashes(url.pathname)) ||
      url.search ||
      url.hash
    ) {
      return undefined;
    }

    return {
      hostname: url.hostname.toLowerCase(),
      pathPrefix: options.rejectUrlParts
        ? ""
        : normalizeUrlPathPrefix(url.pathname),
      protocol: url.protocol as MediaUrlSource["protocol"],
    };
  } catch {
    return undefined;
  }
}

function readHostFromBareValue(
  value: string,
  options: { rejectUnsafeProductionHost?: boolean },
): string | undefined {
  if (!value || hasControlCharacter(value) || /[/?#\\@]/.test(value)) {
    return undefined;
  }

  try {
    const url = new URL(`https://${value}`);

    if (
      options.rejectUnsafeProductionHost &&
      isUnsafeProductionHostname(url.hostname)
    ) {
      return undefined;
    }

    return url.hostname.toLowerCase();
  } catch {
    return undefined;
  }
}

function matchesPathPrefix(pathname: string, pathPrefix: string): boolean {
  if (!pathPrefix) {
    return true;
  }

  return pathname === pathPrefix || pathname.startsWith(`${pathPrefix}/`);
}

function normalizeUrlPathPrefix(pathname: string): string {
  return trimTrailingSlashes(pathname);
}

function trimTrailingSlashes(pathname: string): string {
  return pathname.replace(/\/+$/, "");
}

function readControlSafeTrimmedValue(
  value: string | undefined,
): string | undefined {
  if (!value || hasControlCharacter(value)) {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed || undefined;
}

function hasControlCharacter(value: string): boolean {
  return Array.from(value).some((character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    return codePoint <= 0x1f || codePoint === 0x7f;
  });
}
