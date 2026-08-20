const fallbackRequestId = "local-dev";
const maxRequestIdLength = 128;
const requestIdPattern = /^[A-Za-z0-9._:-]+$/;

export interface RequestHeadersLike {
  "x-request-id"?: string | string[];
}

export function readRequestId(headers?: RequestHeadersLike): string {
  const value = headers?.["x-request-id"];
  const candidate = Array.isArray(value) ? value[0] : value;

  if (!candidate) {
    return fallbackRequestId;
  }

  const trimmed = candidate.trim();

  if (
    !trimmed ||
    trimmed.length > maxRequestIdLength ||
    !requestIdPattern.test(trimmed)
  ) {
    return fallbackRequestId;
  }

  return trimmed;
}
