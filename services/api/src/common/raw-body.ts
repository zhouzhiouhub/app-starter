export const stripeWebhookRawBodyRoutePath = "api/v1/webhooks/stripe";

export const rawBodySymbol = Symbol.for("app-starter.raw-body");

export interface RawBodyCaptureRequest {
  method?: string;
  originalUrl?: string;
  url?: string;
  [rawBodySymbol]?: Buffer;
}

export function createRouteRawBodyCapture(routePath: string) {
  const normalizedRoutePath = normalizeRawBodyRoutePath(routePath);

  return (
    request: RawBodyCaptureRequest,
    _response: unknown,
    buffer: Buffer,
  ) => {
    if (request.method?.toUpperCase() !== "POST") {
      return;
    }

    const requestPath = normalizeRawBodyRoutePath(readRequestPath(request));

    if (requestPath !== normalizedRoutePath) {
      return;
    }

    request[rawBodySymbol] = Buffer.from(buffer);
  };
}

export function readCapturedRawBody(
  request: RawBodyCaptureRequest | undefined,
) {
  return request?.[rawBodySymbol] ?? null;
}

export function normalizeRawBodyRoutePath(routePath: string) {
  return routePath
    .trim()
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .replace(/\/+$/, "");
}

function readRequestPath(request: RawBodyCaptureRequest) {
  const candidate = request.originalUrl ?? request.url ?? "";
  return candidate.split("?")[0]?.split("#")[0] ?? "";
}
