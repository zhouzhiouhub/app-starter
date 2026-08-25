import { useCallback, useEffect, useRef, useState } from "react";
import { redirectWhenAuthRequired } from "../../auth/auth-redirect";
import { formatRequestError } from "../../../lib/api-error";
import { listPageVersions } from "../api";
import type { PageVersionListMeta, PageVersionSummary } from "../types";

const versionHistoryPageSize = 10;

export function usePageVersionList(pageId: string | undefined) {
  const requestIdRef = useRef(0);
  const [versions, setVersions] = useState<PageVersionSummary[]>([]);
  const [meta, setMeta] = useState<PageVersionListMeta>(() =>
    createEmptyMeta(pageId),
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPage = useCallback(
    async (page: number) => {
      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;

      if (!pageId) {
        setVersions([]);
        setMeta(createEmptyMeta(pageId));
        setError(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const result = await listPageVersions(
          pageId,
          page,
          versionHistoryPageSize,
        );

        if (requestIdRef.current !== requestId) {
          return;
        }

        setVersions(result.data);
        setMeta(result.meta);
      } catch (caught) {
        if (redirectWhenAuthRequired(caught)) {
          return;
        }

        if (requestIdRef.current !== requestId) {
          return;
        }

        setVersions([]);
        setMeta(createEmptyMeta(pageId, page));
        setError(formatRequestError(caught));
      } finally {
        if (requestIdRef.current === requestId) {
          setIsLoading(false);
        }
      }
    },
    [pageId],
  );

  useEffect(() => {
    void loadPage(1);
  }, [loadPage]);

  const refreshFirstPage = useCallback(() => loadPage(1), [loadPage]);

  return {
    error,
    isLoading,
    loadPage,
    meta,
    refreshFirstPage,
    versions,
  };
}

function createEmptyMeta(
  pageId: string | undefined,
  page = 1,
): PageVersionListMeta {
  return {
    limit: versionHistoryPageSize,
    page,
    pageId: pageId ?? "",
    total: 0,
  };
}
