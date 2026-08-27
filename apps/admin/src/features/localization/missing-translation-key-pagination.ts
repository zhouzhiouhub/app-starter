export interface MissingTranslationKeyPaginationState {
  currentPage: number;
  endIndex: number;
  keys: string[];
  pageSize: number;
  startIndex: number;
  totalCount: number;
  totalPages: number;
}

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

function clampPage(page: number, totalPages: number): number {
  if (!Number.isFinite(page)) {
    return 1;
  }

  return Math.min(Math.max(1, Math.floor(page)), totalPages);
}
