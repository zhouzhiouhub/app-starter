import { BadRequestException } from "@nestjs/common";
import { apiErrorCodes, isSensitiveUrlParameterKey } from "@app-starter/schema";
import {
  isAllowedMediaUrlSource,
  readAllowedMediaUrlSources,
  readExternalMediaUrlHosts,
  type MediaUrlSource,
} from "./media.url-sources.js";

export {
  readAllowedMediaUrlHosts,
  readExternalMediaUrlHosts,
  readManagedMediaUrlHosts,
} from "./media.url-sources.js";

export function assertAllowedMediaUrl(
  url: string,
  env: Record<string, string | undefined> = process.env,
) {
  assertAllowedMediaUrlSource(url, readAllowedMediaUrlSources(env), {
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

function assertAllowedMediaUrlSource(
  url: string,
  allowedSources: MediaUrlSource[],
  input: { message: string },
) {
  const parsed = readSafeMediaUrl(url, {});
  const source = allowedSources.find((candidate) =>
    isAllowedMediaUrlSource(parsed, candidate),
  );

  if (source) {
    return;
  }

  throw new BadRequestException({
    code: apiErrorCodes.VALIDATION_ERROR,
    message: input.message,
    details: {
      host: parsed.hostname,
    },
  });
}

function assertAllowedMediaUrlHost(
  url: string,
  allowedHosts: Set<string>,
  input: { message: string; requireHttps?: boolean },
) {
  const parsed = readSafeMediaUrl(url, { requireHttps: input.requireHttps });

  assertAllowedHost(parsed.hostname, allowedHosts, input.message);
}

function readSafeMediaUrl(
  url: string,
  input: { requireHttps?: boolean },
): URL {
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

  if (parsed.hash) {
    throw new BadRequestException({
      code: apiErrorCodes.VALIDATION_ERROR,
      message: "Media URL must not include fragments.",
    });
  }

  if (hasSensitiveMediaUrlQueryParameters(parsed)) {
    throw new BadRequestException({
      code: apiErrorCodes.VALIDATION_ERROR,
      message: "Media URL must not include credential or token parameters.",
    });
  }

  return parsed;
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

function hasSensitiveMediaUrlQueryParameters(url: URL): boolean {
  return Array.from(url.searchParams.keys()).some(isSensitiveMediaUrlQueryKey);
}

function isSensitiveMediaUrlQueryKey(key: string): boolean {
  return isSensitiveUrlParameterKey(key);
}
