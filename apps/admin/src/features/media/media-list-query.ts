import type { MediaAssetListStatus, MediaAssetType } from "./types";

const defaultPage = 1;
const defaultStatus: MediaAssetListStatus = "active";
const mediaListStatuses = new Set<MediaAssetListStatus>([
  "active",
  "archived",
  "all",
]);
const mediaListTypes = new Set<MediaAssetType>([
  "image",
  "video",
  "pdf",
  "other",
]);

interface MediaListSearchOptions {
  page?: number;
  status?: MediaAssetListStatus;
  type?: MediaAssetType | null;
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

export function readMediaListType(
  searchParams: URLSearchParams,
): MediaAssetType | null {
  const type = searchParams.get("type")?.trim();

  if (!type || !mediaListTypes.has(type as MediaAssetType)) {
    return null;
  }

  return type as MediaAssetType;
}

export function buildMediaListSearch(
  options: MediaListSearchOptions = {},
): string {
  const searchParams = new URLSearchParams();
  const status = options.status ?? defaultStatus;

  if (status !== defaultStatus) {
    searchParams.set("status", status);
  }

  if (options.type) {
    searchParams.set("type", options.type);
  }

  if (options.page && options.page > defaultPage) {
    searchParams.set("page", String(options.page));
  }

  return searchParams.toString();
}
