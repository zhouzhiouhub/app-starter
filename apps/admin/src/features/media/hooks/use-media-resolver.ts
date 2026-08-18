import { useCallback, useEffect, useState } from "react";
import type { MediaAssetReference } from "@app-starter/schema";
import { listMediaAssets } from "../api";

export function useMediaResolver() {
  const [urlsByReference, setUrlsByReference] = useState<Record<string, string>>(
    {},
  );

  useEffect(() => {
    let active = true;

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
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, []);

  return useCallback(
    (reference: MediaAssetReference) => urlsByReference[reference] ?? reference,
    [urlsByReference],
  );
}
