import { AuditOutlined } from "@ant-design/icons";
import { Button, Card, Empty, List, Space, Tag, Typography } from "antd";
import { useNavigate } from "react-router-dom";
import type { AuditLog } from "../../audit/types";
import type { DashboardAuditSummary } from "../types";

export function DashboardActivityPanel(props: { audit: DashboardAuditSummary }) {
  const navigate = useNavigate();

  return (
    <Card
      extra={
        <Button
          icon={<AuditOutlined />}
          onClick={() => navigate("/audit-logs")}
          type="link"
        >
          Audit Logs
        </Button>
      }
      style={{ height: "100%" }}
      title="Recent Activity"
    >
      {props.audit.recent.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <List
          dataSource={props.audit.recent}
          renderItem={(log) => <ActivityItem log={log} />}
        />
      )}
    </Card>
  );
}

function ActivityItem(props: { log: AuditLog }) {
  return (
    <List.Item>
      <List.Item.Meta
        description={
          <Space size="small" wrap>
            <Typography.Text type="secondary">
              {props.log.targetType}
            </Typography.Text>
            <Typography.Text type="secondary">
              {new Date(props.log.createdAt).toLocaleString()}
            </Typography.Text>
          </Space>
        }
        title={
          <Space size="small" wrap>
            <Tag>{props.log.action}</Tag>
            <Typography.Text>{props.log.targetId ?? "system"}</Typography.Text>
          </Space>
        }
      />
    </List.Item>
  );
}
