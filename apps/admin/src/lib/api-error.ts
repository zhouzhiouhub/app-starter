import { getApiBaseUrl } from "./api-base-url";

export function formatRequestError(error: unknown): string {
  if (error instanceof TypeError && error.message === "Failed to fetch") {
    return `Cannot reach API at ${getApiBaseUrl()}. Start the API service and try again.`;
  }

  return error instanceof Error ? error.message : "Request failed.";
}

export function readApiErrorMessage(result: unknown, fallback: string): string {
  if (!result || typeof result !== "object") {
    return fallback;
  }

  const record = result as {
    error?: { message?: unknown };
    message?: unknown;
  };

  if (typeof record.error?.message === "string") {
    return record.error.message;
  }

  if (typeof record.message === "string") {
    return record.message;
  }

  return fallback;
}
