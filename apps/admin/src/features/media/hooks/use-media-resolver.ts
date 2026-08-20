import { useCallback, useEffect, useMemo, useState } from "react";
import type { MediaAssetReference } from "@app-starter/schema";
import { formatRequestError } from "../../../lib/api-error";
import { listAllActiveMediaAssets } from "../api";

export interface MediaResolverState {
  error: string | null;
  isLoading: boolean;
  resolveMediaUrl: (reference: MediaAssetReference) => string;
  urlsByReference: Record<string, string>;
}

export function useMediaResolver(): MediaResolverState {
  const [urlsByReference, setUrlsByReference] = useState<
    Record<string, string>
  >({});
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    setError(null);
    setIsLoading(true);

    listAllActiveMediaAssets()
      .then((assets) => {
        if (!active) {
          return;
        }

        setUrlsByReference(
          Object.fromEntries(
            assets.map((asset) => [asset.reference, asset.url]),
          ),
        );
        setError(null);
      })
      .catch((caught: unknown) => {
        if (!active) {
          return;
        }

        setUrlsByReference({});
        setError(formatRequestError(caught));
      })
      .finally(() => {
        if (!active) {
          return;
        }

        setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const resolveMediaUrl = useCallback(
    (reference: MediaAssetReference) => urlsByReference[reference] ?? reference,
    [urlsByReference],
  );

  return useMemo(
    () => ({
      error,
      isLoading,
      resolveMediaUrl,
      urlsByReference,
    }),
    [error, isLoading, resolveMediaUrl, urlsByReference],
  );
}
