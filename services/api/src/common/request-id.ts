import { randomUUID } from "node:crypto";

const fallbackRequestId = "local-dev";
const maxRequestIdLength = 128;
const requestIdPattern = /^[A-Za-z0-9._:-]+$/;
export const requestIdHeaderName = "X-Request-Id";

export interface RequestHeadersLike {
  "x-request-id"?: string | string[];
}

interface RequestLike {
  headers?: RequestHeadersLike;
}

interface ResponseLike {
  setHeader: (name: string, value: string) => void;
}

type NextFunctionLike = () => void;
type RequestIdHeaderMiddleware = (
  request: RequestLike,
  response: ResponseLike,
  next: NextFunctionLike,
) => void;

export function readRequestId(
  headers?: RequestHeadersLike,
  fallback = fallbackRequestId,
): string {
  const value = headers?.["x-request-id"];
  const candidate = Array.isArray(value) ? value[0] : value;

  if (!candidate) {
    return fallback;
  }

  if (hasControlCharacter(candidate)) {
    return fallback;
  }

  const trimmed = candidate.trim();

  if (
    !trimmed ||
    trimmed.length > maxRequestIdLength ||
    !requestIdPattern.test(trimmed)
  ) {
    return fallback;
  }

  return trimmed;
}

export function createRequestIdHeaderMiddleware(
  createFallbackRequestId: () => string = createGeneratedRequestId,
): RequestIdHeaderMiddleware {
  return (request, response, next) => {
    const requestId = readRequestId(request.headers, createFallbackRequestId());
    request.headers = {
      ...(request.headers ?? {}),
      "x-request-id": requestId,
    };
    response.setHeader(requestIdHeaderName, requestId);
    next();
  };
}

export const requestIdHeaderMiddleware = createRequestIdHeaderMiddleware();

function createGeneratedRequestId(): string {
  return randomUUID();
}

function hasControlCharacter(value: string): boolean {
  return Array.from(value).some((character) => {
    const codePoint = character.codePointAt(0) ?? 0;

    return codePoint <= 0x1f || codePoint === 0x7f;
  });
}
