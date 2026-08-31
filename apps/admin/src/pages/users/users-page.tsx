import { ReloadOutlined } from "@ant-design/icons";
import { Alert, Button, Skeleton, Space, Typography } from "antd";
import { UsersOverview } from "../../features/users/components/users-overview";
import { useCurrentUser } from "../../features/users/hooks/use-current-user";
import { buildUserAccessSummary } from "../../features/users/user-access-summary";

export function UsersPage() {
  const { error, isLoading, load, user } = useCurrentUser();

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Space
        align="start"
        style={{ justifyContent: "space-between", width: "100%" }}
        wrap
      >
        <Typography.Title level={3} style={{ margin: 0 }}>
          Users
        </Typography.Title>
        <Button icon={<ReloadOutlined />} loading={isLoading} onClick={load}>
          Refresh
        </Button>
      </Space>
      {error ? <Alert message={error} showIcon type="error" /> : null}
      {user ? (
        <UsersOverview summary={buildUserAccessSummary(user)} />
      ) : (
        <Skeleton active paragraph={{ rows: 8 }} title />
      )}
    </Space>
  );
}
