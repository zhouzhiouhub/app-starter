import { getApiBaseUrl } from "./api-base-url.ts";

interface ApiErrorPayload {
  code?: string;
  details?: unknown;
  message?: string;
  requestId?: string;
}

interface ImageSourceIssue {
  field?: unknown;
  reason?: unknown;
}

export class ApiRequestError extends Error {
  code?: string;
  details?: unknown;
  requestId?: string;

  constructor(payload: ApiErrorPayload, fallback: string) {
    super(payload.message ?? fallback);
    this.name = "ApiRequestError";
    this.code = payload.code;
    this.details = payload.details;
    this.requestId = payload.requestId;
  }
}

export function createApiRequestError(
  result: unknown,
  fallback: string,
): ApiRequestError {
  return new ApiRequestError(readApiErrorPayload(result), fallback);
}

export function formatRequestError(error: unknown): string {
  if (error instanceof TypeError && error.message === "Failed to fetch") {
    return `Cannot reach API at ${getApiBaseUrl()}. Start the API service and try again.`;
  }

  if (error instanceof ApiRequestError) {
    return formatApiRequestError(error);
  }

  return error instanceof Error ? error.message : "Request failed.";
}

export function readApiErrorMessage(result: unknown, fallback: string): string {
  return createApiRequestError(result, fallback).message;
}

function readApiErrorPayload(result: unknown): ApiErrorPayload {
  if (!result || typeof result !== "object") {
    return {};
  }

  const record = result as {
    error?: {
      code?: unknown;
      details?: unknown;
      message?: unknown;
      requestId?: unknown;
    };
    message?: unknown;
  };
  const nestedError = record.error;

  if (nestedError && typeof nestedError === "object") {
    return {
      code: readString(nestedError.code),
      details: nestedError.details,
      message: readString(nestedError.message),
      requestId: readString(nestedError.requestId),
    };
  }

  if (typeof record.message === "string") {
    return { message: record.message };
  }

  return {};
}

function formatApiRequestError(error: ApiRequestError): string {
  const segments = [
    error.code ? `${error.code}: ${error.message}` : error.message,
    formatApiErrorDetails(error.details),
    error.requestId ? `Request ID: ${error.requestId}.` : null,
  ].filter((segment): segment is string => Boolean(segment));

  return segments.join(" ");
}

function formatApiErrorDetails(details: unknown): string | null {
  if (!details || typeof details !== "object") {
    return null;
  }

  const record = details as Record<string, unknown>;
  const segments = [
    formatInvalidImageSources(record.invalidImageSources),
    formatReferenceList("Missing media references", record.missingReferences),
    formatReferenceList("Archived media references", record.archivedReferences),
  ].filter((segment): segment is string => Boolean(segment));

  return segments.length ? segments.join(" ") : null;
}

function formatInvalidImageSources(value: unknown): string | null {
  if (!Array.isArray(value) || value.length === 0) {
    return null;
  }

  const issues = value
    .slice(0, 3)
    .map((issue: ImageSourceIssue) => {
      const field = readString(issue?.field) ?? "unknown field";
      const reason = readString(issue?.reason);

      return reason ? `${field} (${reason})` : field;
    });
  const remainingCount = value.length - issues.length;

  return formatIssueList("Invalid image sources", issues, remainingCount);
}

function formatReferenceList(label: string, value: unknown): string | null {
  if (!Array.isArray(value) || value.length === 0) {
    return null;
  }

  const references = value
    .slice(0, 3)
    .map((item) => readString(item))
    .filter((item): item is string => Boolean(item));
  const remainingCount = value.length - references.length;

  return references.length
    ? formatIssueList(label, references, remainingCount)
    : null;
}

function formatIssueList(
  label: string,
  values: string[],
  remainingCount: number,
): string {
  const suffix =
    remainingCount > 0 ? `, and ${remainingCount} more` : "";

  return `${label}: ${values.join(", ")}${suffix}.`;
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}
