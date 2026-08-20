import { BadRequestException } from "@nestjs/common";
import { apiErrorCodes } from "@app-starter/schema";
import { DEFAULT_MEDIA_CDN_BASE_URL } from "./media.constants.js";

export function assertAllowedMediaUrl(
  url: string,
  env: Record<string, string | undefined> = process.env,
) {
  assertAllowedMediaUrlHost(url, readAllowedMediaUrlHosts(env), {
    message: "Media URL host is not allowed.",
  });
}

export function assertAllowedExternalMediaUrl(
  url: string,
  env: Record<string, string | undefined> = process.env,
) {
  assertAllowedMediaUrlHost(url, readExternalMediaUrlHosts(env), {
    requireHttps: true,
    message: "External media URL host is not allowed.",
  });
}

function assertAllowedMediaUrlHost(
  url: string,
  allowedHosts: Set<string>,
  input: { message: string; requireHttps?: boolean },
) {
  const parsed = new URL(url);

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new BadRequestException({
      code: apiErrorCodes.VALIDATION_ERROR,
      message: "Media URL must be http(s).",
    });
  }

  if (input.requireHttps && parsed.protocol !== "https:") {
    throw new BadRequestException({
      code: apiErrorCodes.VALIDATION_ERROR,
      message: "External media URL must use https.",
    });
  }

  if (parsed.username || parsed.password) {
    throw new BadRequestException({
      code: apiErrorCodes.VALIDATION_ERROR,
      message: "Media URL must not include credentials.",
    });
  }

  assertAllowedHost(parsed.hostname, allowedHosts, input.message);
}

export function readAllowedMediaUrlHosts(
  env: Record<string, string | undefined> = process.env,
): Set<string> {
  return new Set([
    ...readExternalMediaUrlHosts(env),
    ...readManagedMediaUrlHosts(env),
  ]);
}

export function readExternalMediaUrlHosts(
  env: Record<string, string | undefined> = process.env,
): Set<string> {
  return new Set(readHostsFromList(env.MEDIA_EXTERNAL_URL_HOSTS));
}

export function readManagedMediaUrlHosts(
  env: Record<string, string | undefined> = process.env,
): Set<string> {
  return new Set(
    [
      readSafeHostFromHttpUrl(env.MEDIA_CDN_BASE_URL),
      readSafeHostFromHttpUrl(env.CDN_BASE_URL),
      readSafeHostFromHttpUrl(DEFAULT_MEDIA_CDN_BASE_URL),
    ].filter((host): host is string => Boolean(host)),
  );
}

function readHostsFromList(value: string | undefined): string[] {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((item) => readHostFromUrlOrHost(item.trim()))
    .filter((host): host is string => Boolean(host));
}

function readHostFromUrlOrHost(value: string): string | undefined {
  if (!value) {
    return undefined;
  }

  return readSafeHostFromHttpUrl(value) ?? readHostFromBareValue(value);
}

function readSafeHostFromHttpUrl(
  value: string | undefined,
): string | undefined {
  const trimmed = value?.trim();

  if (!trimmed) {
    return undefined;
  }

  try {
    const url = new URL(trimmed);

    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    ) {
      return undefined;
    }

    return url.hostname.toLowerCase();
  } catch {
    return undefined;
  }
}

function readHostFromBareValue(value: string): string | undefined {
  if (!value || /[/?#\\@]/.test(value)) {
    return undefined;
  }

  try {
    return new URL(`https://${value}`).hostname.toLowerCase();
  } catch {
    return undefined;
  }
}

function assertAllowedHost(
  hostname: string,
  allowedHosts: Set<string>,
  message: string,
) {
  if (allowedHosts.has(hostname.toLowerCase())) {
    return;
  }

  throw new BadRequestException({
    code: apiErrorCodes.VALIDATION_ERROR,
    message,
    details: {
      host: hostname,
    },
  });
}
