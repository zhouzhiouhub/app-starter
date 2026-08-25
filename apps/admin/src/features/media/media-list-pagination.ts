import type { MediaAsset, MediaListMeta } from "./types.ts";

export type MediaAssetPageLoader = (
  page: number,
  limit: number,
) => Promise<{ data: MediaAsset[]; meta: MediaListMeta }>;

export async function listAllMediaAssetPages(
  loadPage: MediaAssetPageLoader,
  limit: number,
): Promise<MediaAsset[]> {
  const assets: MediaAsset[] = [];
  let page = 1;

  while (true) {
    const result = await loadPage(page, limit);

    assets.push(...result.data);

    if (!shouldLoadNextMediaAssetPage(result, assets.length, limit)) {
      return assets;
    }

    page += 1;
  }
}

function shouldLoadNextMediaAssetPage(
  result: Awaited<ReturnType<MediaAssetPageLoader>>,
  loadedCount: number,
  limit: number,
): boolean {
  if (result.data.length === 0) {
    return false;
  }

  if (loadedCount < result.meta.total) {
    return true;
  }

  return result.data.length >= limit;
}
