export type RevalidateErrorBody = {
  error: {
    code: string;
    details?: unknown;
    message: string;
    requestId: string;
  };
};

export const revalidateResponseHeaders = {
  "Cache-Control": "no-store",
} as const;

export function createRevalidateResponseInit(input?: {
  status?: number;
}): {
  headers: typeof revalidateResponseHeaders;
  status?: number;
} {
  return {
    headers: revalidateResponseHeaders,
    ...(input?.status === undefined ? {} : { status: input.status }),
  };
}

export function createRevalidateErrorBody(input: {
  code: string;
  details?: unknown;
  message: string;
  requestId: string;
}): RevalidateErrorBody {
  return {
    error: {
      code: input.code,
      ...(input.details === undefined ? {} : { details: input.details }),
      message: input.message,
      requestId: input.requestId,
    },
  };
}
