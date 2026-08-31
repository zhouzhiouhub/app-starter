import { ReloadOutlined } from "@ant-design/icons";
import { customAdminRoutes } from "@app-starter/custom-admin";
import { Alert, Button, Skeleton, Space } from "antd";
import { DashboardOverview } from "../../features/dashboard/components/dashboard-overview";
import { useDashboardSummary } from "../../features/dashboard/hooks/use-dashboard-summary";

export function DashboardPage() {
  const { error, isLoading, load, summary } =
    useDashboardSummary(customAdminRoutes);

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      {error ? (
        <Alert
          action={
            <Button icon={<ReloadOutlined />} onClick={load}>
              Retry
            </Button>
          }
          message={error}
          showIcon
          type="error"
        />
      ) : null}
      {summary ? (
        <DashboardOverview
          isRefreshing={isLoading}
          onRefresh={load}
          summary={summary}
        />
      ) : (
        <Skeleton active paragraph={{ rows: 10 }} title />
      )}
    </Space>
  );
}
