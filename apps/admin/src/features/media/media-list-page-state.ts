import type { MediaAssetListStatus } from "./types";

interface MediaListArchivePageOptions {
  currentPage: number;
  pageSize: number;
  status: MediaAssetListStatus;
  total: number;
}

export function readMediaListPageAfterArchive(
  options: MediaListArchivePageOptions,
): number {
  const currentPage = readPositiveInteger(options.currentPage, 1);

  if (options.status !== "active") {
    return currentPage;
  }

  const pageSize = readPositiveInteger(options.pageSize, 1);
  const nextTotal = Math.max(0, options.total - 1);
  const maxPage = Math.max(1, Math.ceil(nextTotal / pageSize));

  return Math.min(currentPage, maxPage);
}

function readPositiveInteger(value: number, fallback: number): number {
  return Number.isInteger(value) && value > 0 ? value : fallback;
}
