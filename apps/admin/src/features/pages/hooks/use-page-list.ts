import { useCallback, useEffect, useState } from "react";
import { AuthRequiredError } from "../../auth/api";
import { formatRequestError } from "../../../lib/api-error";
import { listPages } from "../api";
import { DEFAULT_PAGE_LIST_LIMIT } from "../constants";
import type { PageListMeta, PageSummary } from "../types";

export function usePageList(page = 1) {
  const [pages, setPages] = useState<PageSummary[]>([]);
  const [meta, setMeta] = useState<PageListMeta>({
    limit: DEFAULT_PAGE_LIST_LIMIT,
    page: 1,
    total: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (nextPage = page) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await listPages(nextPage, DEFAULT_PAGE_LIST_LIMIT);
      setPages(result.data);
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
  }, [page]);

  useEffect(() => {
    void load(page);
  }, [load, page]);

  return { error, isLoading, load, meta, pages };
}
