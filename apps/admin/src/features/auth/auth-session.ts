import { AUTH_SESSION_STORAGE_KEY } from "./constants.ts";
import type { AuthSession } from "./types";

export function readAuthSession(): AuthSession | null {
  const raw = readStorageItem(AUTH_SESSION_STORAGE_KEY);

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
  writeStorageItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(session));
}

export function clearAuthSession(): void {
  removeStorageItem(AUTH_SESSION_STORAGE_KEY);
}

function readStorageItem(key: string): string | null {
  try {
    return globalThis.localStorage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function writeStorageItem(key: string, value: string): void {
  try {
    globalThis.localStorage?.setItem(key, value);
  } catch {
    // Storage can be blocked by browser privacy settings or quota limits.
  }
}

function removeStorageItem(key: string): void {
  try {
    globalThis.localStorage?.removeItem(key);
  } catch {
    // Clearing auth state should never break logout or recovery flows.
  }
}
