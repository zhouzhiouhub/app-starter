import { AUTH_SESSION_STORAGE_KEY } from "./constants";
import type { AuthSession } from "./types";

export function readAuthSession(): AuthSession | null {
  const raw = globalThis.localStorage?.getItem(AUTH_SESSION_STORAGE_KEY);

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as AuthSession;

    if (!parsed.accessToken || !parsed.refreshToken || !parsed.user?.id) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function writeAuthSession(session: AuthSession): void {
  globalThis.localStorage?.setItem(
    AUTH_SESSION_STORAGE_KEY,
    JSON.stringify(session),
  );
}

export function clearAuthSession(): void {
  globalThis.localStorage?.removeItem(AUTH_SESSION_STORAGE_KEY);
}
