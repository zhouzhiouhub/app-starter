import { AUTH_SESSION_STORAGE_KEY } from "./constants.ts";
import type { AuthSession } from "./types";

const maxAuthTokenLength = 4096;
const maxAuthTextLength = 256;
const maxAuthListItems = 64;

export function readAuthSession(): AuthSession | null {
  const raw = readStorageItem(AUTH_SESSION_STORAGE_KEY);

  if (!raw) {
    return null;
  }

  try {
    const session = readValidAuthSession(JSON.parse(raw));

    if (session) {
      return session;
    }
  } catch {
    // Malformed persisted auth state should not linger after detection.
  }

  clearAuthSession();
  return null;
}

export function readValidAuthSession(value: unknown): AuthSession | null {
  if (!isRecord(value)) {
    return null;
  }

  const accessToken = readAuthToken(value.accessToken);
  const refreshToken = readAuthToken(value.refreshToken);
  const user = readAuthUser(value.user);

  if (!accessToken || !refreshToken || !user) {
    return null;
  }

  return {
    accessToken,
    refreshToken,
    user,
  };
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

function readAuthUser(value: unknown): AuthSession["user"] | null {
  if (!isRecord(value)) {
    return null;
  }

  const email = readSafeAuthText(value.email);
  const id = readSafeAuthText(value.id);
  const name = readOptionalAuthText(value.name);
  const roles = readSafeAuthTextList(value.roles);
  const scopes = readSafeAuthTextList(value.scopes);
  const tenantId = readSafeAuthText(value.tenantId);

  if (!email || !id || name === undefined || !roles || !scopes || !tenantId) {
    return null;
  }

  return {
    email,
    id,
    name,
    roles,
    scopes,
    tenantId,
  };
}

function readAuthToken(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  if (!value || value.length > maxAuthTokenLength || /\s/.test(value)) {
    return null;
  }

  return hasControlCharacter(value) ? null : value;
}

function readSafeAuthText(value: unknown): string | null {
  if (typeof value !== "string" || value.trim() !== value) {
    return null;
  }

  if (!value || value.length > maxAuthTextLength || hasControlCharacter(value)) {
    return null;
  }

  return value;
}

function readOptionalAuthText(value: unknown): string | null | undefined {
  if (value === null || value === undefined) {
    return null;
  }

  return readSafeAuthText(value) ?? undefined;
}

function readSafeAuthTextList(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length > maxAuthListItems) {
    return null;
  }

  const items = value.map(readSafeAuthText);

  return items.every((item): item is string => Boolean(item)) ? items : null;
}

function hasControlCharacter(value: string): boolean {
  return Array.from(value).some((character) => {
    const codePoint = character.codePointAt(0) ?? 0;
    return codePoint <= 0x1f || codePoint === 0x7f;
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
