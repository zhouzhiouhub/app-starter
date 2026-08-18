import { useCallback, useEffect, useState } from "react";
import { AuthRequiredError } from "../../auth/api";
import { formatRequestError } from "../../../lib/api-error";
import { DEFAULT_MEDIA_LIST_LIMIT } from "../constants";
import { listMediaAssets } from "../api";
import type {
  MediaAsset,
  MediaAssetListStatus,
  MediaListMeta,
} from "../types";

export function useMediaList(status: MediaAssetListStatus = "active") {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [meta, setMeta] = useState<MediaListMeta>({
    limit: DEFAULT_MEDIA_LIST_LIMIT,
    page: 1,
    total: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (page = 1) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await listMediaAssets(
        page,
        DEFAULT_MEDIA_LIST_LIMIT,
        status,
      );
      setAssets(result.data);
      setMeta(result.meta);
    } catch (caught) {
      if (caught instanceof AuthRequiredError) {
        globalThis.location.assign("/login");
        return;
      }

      setError(formatRequestError(caught));
    } finally {
      setIsLoading(false);
    }
  }, [status]);

  useEffect(() => {
    void load(1);
  }, [load]);

  return { assets, error, isLoading, load, meta };
}
