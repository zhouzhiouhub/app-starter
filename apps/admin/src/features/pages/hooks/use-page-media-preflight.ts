import { useMemo } from "react";
import {
  collectMediaReferences,
  type MediaAssetReference,
  type PageSchema,
} from "@app-starter/schema";
import { readMediaResolverFeedback } from "../../media/media-resolver-feedback";
import { useMediaResolver } from "../../media/hooks/use-media-resolver";

export function usePageMediaPreflight(schema: PageSchema | null) {
  const mediaResolver = useMediaResolver();
  const mediaReferences = useMemo<MediaAssetReference[]>(
    () => (schema ? collectMediaReferences(schema) : []),
    [schema],
  );
  const mediaFeedback = useMemo(
    () =>
      readMediaResolverFeedback({
        error: mediaResolver.error,
        isLoading: mediaResolver.isLoading,
        references: mediaReferences,
        urlsByReference: mediaResolver.urlsByReference,
      }),
    [
      mediaReferences,
      mediaResolver.error,
      mediaResolver.isLoading,
      mediaResolver.urlsByReference,
    ],
  );

  return {
    mediaFeedback,
    mediaReferences,
    mediaResolver,
  };
}
