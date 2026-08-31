import { Alert, Button, Skeleton, Space, Typography } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import { AnalyticsOverview } from "../../features/analytics/components/analytics-overview";
import { buildAnalyticsSettingsSummary } from "../../features/analytics/analytics-settings-summary";
import { useSiteSettings } from "../../features/site-settings/hooks/use-site-settings";

export function AnalyticsPage() {
  const { error, isLoading, load, settings } = useSiteSettings();

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Space
        align="start"
        style={{ justifyContent: "space-between", width: "100%" }}
        wrap
      >
        <Typography.Title level={3} style={{ margin: 0 }}>
          Analytics
        </Typography.Title>
        <Button icon={<ReloadOutlined />} loading={isLoading} onClick={load}>
          Refresh
        </Button>
      </Space>
      {error ? <Alert message={error} showIcon type="error" /> : null}
      {settings ? (
        <AnalyticsOverview summary={buildAnalyticsSettingsSummary(settings)} />
      ) : (
        <Skeleton active paragraph={{ rows: 8 }} title />
      )}
    </Space>
  );
}
