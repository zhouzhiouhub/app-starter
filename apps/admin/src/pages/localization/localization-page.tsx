import { Alert, Button, Spin, Space, Typography } from "antd";
import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { LocalizationStatusPanel } from "../../features/localization/components/localization-status-panel";
import { useLocalizationSummary } from "../../features/localization/hooks/use-localization-summary";
import {
  buildTranslationListSearch,
  readTranslationListFilters,
} from "../../features/localization/translation-list-query";
import type { TranslationListFilters } from "../../features/localization/types";

export function LocalizationPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const translationFilters = useMemo(
    () => readTranslationListFilters(searchParams),
    [searchParams],
  );
  const { error, isLoading, load, summary } =
    useLocalizationSummary(translationFilters);
  const updateTranslationFilters = useCallback(
    (filters: TranslationListFilters) => {
      setSearchParams(
        buildTranslationListSearch({
          limit: translationFilters.limit,
          namespace: filters.namespace,
          page: 1,
          query: filters.query,
        }),
        { replace: true },
      );
    },
    [setSearchParams, translationFilters.limit],
  );
  const updateTranslationPage = useCallback(
    (page: number, limit: number) => {
      setSearchParams(
        buildTranslationListSearch({
          ...translationFilters,
          limit,
          page,
        }),
        { replace: true },
      );
    },
    [setSearchParams, translationFilters],
  );

  return (
    <div>
      <div
        style={{
          alignItems: "flex-start",
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 16,
        }}
      >
        <div>
          <Typography.Title level={3}>Localization</Typography.Title>
          <Typography.Paragraph>
            MVP serves the default market and locale while keeping fallback
            metadata visible.
          </Typography.Paragraph>
        </div>
        <Button onClick={() => void load()}>Refresh</Button>
      </div>
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        {error ? <Alert message={error} showIcon type="error" /> : null}
        {isLoading && !summary ? (
          <div style={{ padding: 48, textAlign: "center" }}>
            <Spin />
          </div>
        ) : summary ? (
          <LocalizationStatusPanel
            filters={translationFilters}
            isFiltering={isLoading}
            onFiltersChange={updateTranslationFilters}
            onPageChange={updateTranslationPage}
            onRefreshMissingKeys={load}
            onTranslationsImported={load}
            onTranslationSaved={load}
            summary={summary}
          />
        ) : null}
      </Space>
    </div>
  );
}
