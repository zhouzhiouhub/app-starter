import { useEffect, useMemo, useRef } from "react";
import {
  collectMediaReferences,
  type MediaAssetReference,
  type PageSchema,
} from "@app-starter/schema";
import {
  createMediaReferenceSetKey,
  readMissingMediaReferences,
} from "../../media/media-reference-resolution.ts";
import { readMediaResolverFeedback } from "../../media/media-resolver-feedback";
import { useMediaResolver } from "../../media/hooks/use-media-resolver";

export function usePageMediaPreflight(schema: PageSchema | null) {
  const mediaResolver = useMediaResolver();
  const refreshedMissingReferenceKeyRef = useRef<string | null>(null);
  const mediaReferences = useMemo<MediaAssetReference[]>(
    () => (schema ? collectMediaReferences(schema) : []),
    [schema],
  );
  const missingMediaReferenceKey = useMemo(
    () =>
      createMediaReferenceSetKey(
        readMissingMediaReferences(
          mediaReferences,
          mediaResolver.urlsByReference,
        ),
      ),
    [mediaReferences, mediaResolver.urlsByReference],
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

  useEffect(() => {
    if (!missingMediaReferenceKey) {
      refreshedMissingReferenceKeyRef.current = null;
      return;
    }

    if (mediaResolver.error || mediaResolver.isLoading) {
      return;
    }

    if (refreshedMissingReferenceKeyRef.current === missingMediaReferenceKey) {
      return;
    }

    refreshedMissingReferenceKeyRef.current = missingMediaReferenceKey;
    void mediaResolver.refresh();
  }, [
    mediaResolver.error,
    mediaResolver.isLoading,
    mediaResolver.refresh,
    missingMediaReferenceKey,
  ]);

  return {
    mediaFeedback,
    mediaReferences,
    mediaResolver,
  };
}
