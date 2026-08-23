import { getApiBaseUrl } from "../../lib/api-base-url.ts";
import { redactApiMessageSecrets } from "../../lib/api-message-redaction.ts";
import { readResponseBody } from "../../lib/api-response.ts";
import {
  clearAuthSession,
  readAuthSession,
  readValidAuthSession,
  writeAuthSession,
} from "./auth-session.ts";
import type { AuthSession, AuthUser } from "./types.ts";

export class AuthRequiredError extends Error {
  constructor() {
    super("Authentication is required.");
    this.name = "AuthRequiredError";
  }
}

let refreshAuthSessionPromise: Promise<AuthSession | null> | null = null;

export async function loginWithPassword(input: {
  email: string;
  password: string;
}): Promise<AuthUser> {
  const response = await fetch(`${getApiBaseUrl()}/auth/login`, {
    body: JSON.stringify(input),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });
  const session = await readSessionResponse(response, "Login failed.");
  writeAuthSession(session);
  return session.user;
}

export async function logoutCurrentSession(): Promise<void> {
  const session = readAuthSession();

  if (session?.refreshToken) {
    await fetch(`${getApiBaseUrl()}/auth/logout`, {
      body: JSON.stringify({ refreshToken: session.refreshToken }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    }).catch(() => undefined);
  }

  clearAuthSession();
}

export async function restoreCurrentUser(): Promise<AuthUser | null> {
  const session = readAuthSession();

  if (!session) {
    return null;
  }

  try {
    const response = await adminRequest("/auth/me");

    if (!response.ok) {
      clearAuthSession();
      return null;
    }

    const result = (await readResponseBody(response)) as { data?: AuthUser };
    return result.data ?? session.user;
  } catch {
    clearAuthSession();
    return null;
  }
}

export async function adminRequest(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const response = await sendWithAccessToken(path, init);

  if (response.status !== 401) {
    return response;
  }

  const refreshed = await refreshAuthSession();

  if (!refreshed) {
    clearAuthSession();
    throw new AuthRequiredError();
  }

  const retried = await sendWithAccessToken(path, init);

  if (retried.status === 401) {
    clearAuthSession();
    throw new AuthRequiredError();
  }

  return retried;
}

function refreshAuthSession(): Promise<AuthSession | null> {
  refreshAuthSessionPromise ??= refreshAuthSessionOnce().finally(() => {
    refreshAuthSessionPromise = null;
  });

  return refreshAuthSessionPromise;
}

async function refreshAuthSessionOnce(): Promise<AuthSession | null> {
  const session = readAuthSession();

  if (!session?.refreshToken) {
    return null;
  }

  const response = await fetch(`${getApiBaseUrl()}/auth/refresh`, {
    body: JSON.stringify({ refreshToken: session.refreshToken }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });

  if (!response.ok) {
    return null;
  }

  const next = await readSessionResponse(response, "Refresh failed.");
  const current = readAuthSession();

  if (current?.refreshToken !== session.refreshToken) {
    return null;
  }

  writeAuthSession(next);
  return next;
}

async function sendWithAccessToken(
  path: string,
  init: RequestInit,
): Promise<Response> {
  const session = readAuthSession();
  const headers = new Headers(init.headers);

  if (session?.accessToken) {
    headers.set("Authorization", `Bearer ${session.accessToken}`);
  }

  return fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers,
  });
}

async function readSessionResponse(
  response: Response,
  fallback: string,
): Promise<AuthSession> {
  const result = await readResponseBody(response);
  const payload = result && typeof result === "object" ? result : {};
  const session = readValidAuthSession(
    (payload as Record<string, unknown>).data,
  );

  if (!response.ok || !session) {
    throw new Error(readAuthApiErrorMessage(result, fallback));
  }

  return session;
}

export function readAuthApiErrorMessage(
  result: unknown,
  fallback: string,
): string {
  return redactApiMessageSecrets(readAuthApiErrorMessageValue(result, fallback));
}

function readAuthApiErrorMessageValue(
  result: unknown,
  fallback: string,
): string {
  if (!result || typeof result !== "object") {
    return fallback;
  }

  const record = result as {
    error?: { message?: unknown } | string;
    message?: unknown;
  };

  if (
    record.error &&
    typeof record.error === "object" &&
    typeof record.error.message === "string"
  ) {
    return record.error.message;
  }

  if (typeof record.message === "string") {
    return record.message;
  }

  if (
    Array.isArray(record.message) &&
    record.message.every((item) => typeof item === "string")
  ) {
    return record.message.join("; ");
  }

  return fallback;
}
