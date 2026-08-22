export type RevalidateErrorBody = {
  error: {
    code: string;
    details?: unknown;
    message: string;
    requestId: string;
  };
};

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
