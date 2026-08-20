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

    if (result.data.length === 0 || assets.length >= result.meta.total) {
      return assets;
    }

    page += 1;
  }
}
