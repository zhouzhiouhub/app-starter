import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { apiErrorCodes } from "@app-starter/schema";

interface HttpResponseLike {
  status: (statusCode: number) => {
    json: (body: unknown) => void;
  };
}

interface HttpRequestLike {
  headers?: Record<string, string | string[] | undefined>;
}

interface NormalizedError {
  code: string;
  message: string;
  details?: unknown;
}

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const http = host.switchToHttp();
    const response = http.getResponse<HttpResponseLike>();
    const request = http.getRequest<HttpRequestLike>();
    const statusCode =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const body =
      exception instanceof HttpException ? exception.getResponse() : undefined;
    const normalized = normalizeError(body, statusCode);

    response.status(statusCode).json({
      error: {
        ...normalized,
        requestId: getRequestId(request),
      },
    });
  }
}

function normalizeError(body: unknown, statusCode: number): NormalizedError {
  const fallback: NormalizedError = {
    code: codeForStatus(statusCode),
    message:
      statusCode >= HttpStatus.INTERNAL_SERVER_ERROR
        ? "Internal server error."
        : "Request failed.",
  };

  if (typeof body === "string") {
    return {
      ...fallback,
      message: body,
    };
  }

  if (!body || typeof body !== "object") {
    return fallback;
  }

  const record = body as Record<string, unknown>;
  const details = record.details;
  const message = readMessage(record.message, record.error, fallback.message);

  return {
    code: typeof record.code === "string" ? record.code : fallback.code,
    message,
    ...(details === undefined ? {} : { details }),
  };
}

function readMessage(
  message: unknown,
  error: unknown,
  fallback: string,
): string {
  if (typeof message === "string") {
    return message;
  }

  if (
    Array.isArray(message) &&
    message.every((item) => typeof item === "string")
  ) {
    return message.join("; ");
  }

  if (typeof error === "string") {
    return error;
  }

  return fallback;
}

function codeForStatus(statusCode: number): string {
  if (statusCode === HttpStatus.UNAUTHORIZED) {
    return apiErrorCodes.UNAUTHORIZED;
  }

  if (statusCode === HttpStatus.FORBIDDEN) {
    return apiErrorCodes.FORBIDDEN;
  }

  if (statusCode === HttpStatus.NOT_FOUND) {
    return apiErrorCodes.NOT_FOUND;
  }

  if (statusCode === HttpStatus.CONFLICT) {
    return apiErrorCodes.CONFLICT;
  }

  if (statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
    return apiErrorCodes.INTERNAL_ERROR;
  }

  return apiErrorCodes.VALIDATION_ERROR;
}

function getRequestId(request: HttpRequestLike): string {
  const value = request.headers?.["x-request-id"];

  if (Array.isArray(value)) {
    return value[0] ?? "local-dev";
  }

  return value ?? "local-dev";
}
