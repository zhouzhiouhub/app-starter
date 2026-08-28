import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MediaAssetReference } from "@app-starter/schema";
import { formatRequestError } from "../../../lib/api-error";
import { listAllActiveMediaAssets } from "../api";
import type { MediaAssetType } from "../types";

export interface MediaResolverState {
  error: string | null;
  isLoading: boolean;
  mediaTypesByReference: Record<string, MediaAssetType>;
  refresh: () => Promise<void>;
  resolveMediaUrl: (reference: MediaAssetReference) => string;
  urlsByReference: Record<string, string>;
}

export function useMediaResolver(): MediaResolverState {
  const [urlsByReference, setUrlsByReference] = useState<
    Record<string, string>
  >({});
  const [mediaTypesByReference, setMediaTypesByReference] = useState<
    Record<string, MediaAssetType>
  >({});
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const mountedRef = useRef(false);
  const requestIdRef = useRef(0);

  const refresh = useCallback(async () => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    setError(null);
    setIsLoading(true);

    try {
      const assets = await listAllActiveMediaAssets();

      if (!mountedRef.current || requestIdRef.current !== requestId) {
        return;
      }

      setMediaTypesByReference(
        Object.fromEntries(assets.map((asset) => [asset.reference, asset.type])),
      );
      setUrlsByReference(
        Object.fromEntries(
          assets
            .filter((asset) => asset.type === "image")
            .map((asset) => [asset.reference, asset.url]),
        ),
      );
      setError(null);
    } catch (caught: unknown) {
      if (!mountedRef.current || requestIdRef.current !== requestId) {
        return;
      }

      setUrlsByReference({});
      setMediaTypesByReference({});
      setError(formatRequestError(caught));
    } finally {
      if (mountedRef.current && requestIdRef.current === requestId) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    void refresh();

    return () => {
      mountedRef.current = false;
      requestIdRef.current += 1;
    };
  }, [refresh]);

  const resolveMediaUrl = useCallback(
    (reference: MediaAssetReference) => urlsByReference[reference] ?? reference,
    [urlsByReference],
  );

  return useMemo(
    () => ({
      error,
      isLoading,
      mediaTypesByReference,
      refresh,
      resolveMediaUrl,
      urlsByReference,
    }),
    [
      error,
      isLoading,
      mediaTypesByReference,
      refresh,
      resolveMediaUrl,
      urlsByReference,
    ],
  );
}
