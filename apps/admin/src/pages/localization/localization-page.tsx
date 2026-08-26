import { useState } from "react";
import { Alert, Button, Spin, Space, Typography } from "antd";
import { LocalizationStatusPanel } from "../../features/localization/components/localization-status-panel";
import { useLocalizationSummary } from "../../features/localization/hooks/use-localization-summary";
import type { TranslationListFilters } from "../../features/localization/types";

export function LocalizationPage() {
  const [translationFilters, setTranslationFilters] =
    useState<TranslationListFilters>({});
  const { error, isLoading, load, summary } =
    useLocalizationSummary(translationFilters);

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
            onFiltersChange={setTranslationFilters}
            onTranslationSaved={load}
            summary={summary}
          />
        ) : null}
      </Space>
    </div>
  );
}
