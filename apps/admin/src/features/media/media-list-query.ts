import type { MediaAssetListStatus } from "./types";

const defaultPage = 1;
const defaultStatus: MediaAssetListStatus = "active";
const mediaListStatuses = new Set<MediaAssetListStatus>([
  "active",
  "archived",
  "all",
]);

interface MediaListSearchOptions {
  page?: number;
  status?: MediaAssetListStatus;
}

export function readMediaListPage(searchParams: URLSearchParams): number {
  const page = Number(searchParams.get("page"));

  if (!Number.isInteger(page) || page < defaultPage) {
    return defaultPage;
  }

  return page;
}

export function readMediaListStatus(
  searchParams: URLSearchParams,
): MediaAssetListStatus {
  const status = searchParams.get("status")?.trim();

  if (!status || !mediaListStatuses.has(status as MediaAssetListStatus)) {
    return defaultStatus;
  }

  return status as MediaAssetListStatus;
}

export function buildMediaListSearch(
  options: MediaListSearchOptions = {},
): string {
  const searchParams = new URLSearchParams();
  const status = options.status ?? defaultStatus;

  if (status !== defaultStatus) {
    searchParams.set("status", status);
  }

  if (options.page && options.page > defaultPage) {
    searchParams.set("page", String(options.page));
  }

  return searchParams.toString();
}
