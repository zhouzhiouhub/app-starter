import { useCallback, useEffect, useMemo, useState } from "react";
import type { MediaAssetReference } from "@app-starter/schema";
import { formatRequestError } from "../../../lib/api-error";
import { listMediaAssets } from "../api";

export function useMediaResolver() {
  const [urlsByReference, setUrlsByReference] = useState<Record<string, string>>(
    {},
  );
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    setError(null);
    setIsLoading(true);

    listMediaAssets(1, 100)
      .then((result) => {
        if (!active) {
          return;
        }

        setUrlsByReference(
          Object.fromEntries(
            result.data.map((asset) => [asset.reference, asset.url]),
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
