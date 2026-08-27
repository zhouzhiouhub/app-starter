export interface MissingTranslationKeyPaginationState {
  currentPage: number;
  endIndex: number;
  keys: string[];
  pageSize: number;
  startIndex: number;
  totalCount: number;
  totalPages: number;
}

export interface MissingTranslationKeyPageStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export const missingTranslationKeyPageStorageKey =
  "localization.missingTranslationKeys.page";

export function readMissingTranslationKeyPaginationState(input: {
  currentPage?: number;
  keys: string[];
  pageSize?: number;
}): MissingTranslationKeyPaginationState {
  const pageSize = Math.max(1, Math.floor(input.pageSize ?? 10));
  const totalCount = input.keys.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const currentPage = clampPage(input.currentPage ?? 1, totalPages);
  const startIndex = totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(totalCount, currentPage * pageSize);

  return {
    currentPage,
    endIndex,
    keys: input.keys.slice(startIndex === 0 ? 0 : startIndex - 1, endIndex),
    pageSize,
    startIndex,
    totalCount,
    totalPages,
  };
}

export function readMissingTranslationKeyPageForKey(input: {
  key?: string | null;
  keys: string[];
  pageSize?: number;
}): number | null {
  const key = input.key?.trim();

  if (!key) {
    return null;
  }

  const index = input.keys.indexOf(key);

  if (index < 0) {
    return null;
  }

  const pageSize = Math.max(1, Math.floor(input.pageSize ?? 10));

  return Math.floor(index / pageSize) + 1;
}

export function readStoredMissingTranslationKeyPage(
  storage: MissingTranslationKeyPageStorage | null | undefined,
): number | null {
  if (!storage) {
    return null;
  }

  try {
    const rawValue = storage.getItem(missingTranslationKeyPageStorageKey);
    const page = rawValue ? Number(rawValue) : NaN;

    return Number.isInteger(page) && page > 0 ? page : null;
  } catch {
    return null;
  }
}

export function writeStoredMissingTranslationKeyPage(
  storage: MissingTranslationKeyPageStorage | null | undefined,
  page: number,
) {
  if (!storage || !Number.isFinite(page) || page < 1) {
    return;
  }

  try {
    storage.setItem(
      missingTranslationKeyPageStorageKey,
      String(Math.floor(page)),
    );
  } catch {
    // Storage can be unavailable in restricted browser modes.
  }
}

export function readBrowserMissingTranslationKeyPage(): number {
  return readStoredMissingTranslationKeyPage(readBrowserSessionStorage()) ?? 1;
}

export function writeBrowserMissingTranslationKeyPage(page: number) {
  writeStoredMissingTranslationKeyPage(readBrowserSessionStorage(), page);
}

function clampPage(page: number, totalPages: number): number {
  if (!Number.isFinite(page)) {
    return 1;
  }

  return Math.min(Math.max(1, Math.floor(page)), totalPages);
}

function readBrowserSessionStorage(): MissingTranslationKeyPageStorage | null {
  try {
    return globalThis.sessionStorage ?? null;
  } catch {
    return null;
  }
}
