import { ApiOutlined } from "@ant-design/icons";
import { Button, Card, Empty, List, Space, Tag, Typography } from "antd";
import { useNavigate } from "react-router-dom";
import type { DashboardCustomRouteSummary } from "../types";

export function DashboardExtensionPanel(props: {
  customRoutes: DashboardCustomRouteSummary;
}) {
  const navigate = useNavigate();

  return (
    <Card
      extra={
        <Button
          icon={<ApiOutlined />}
          onClick={() => navigate("/design-system")}
          type="link"
        >
          Design System
        </Button>
      }
      style={{ height: "100%" }}
      title="Extensions"
    >
      {props.customRoutes.routes.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <List
          dataSource={props.customRoutes.routes}
          renderItem={(route) => (
            <List.Item>
              <List.Item.Meta
                description={
                  <Space size="small" wrap>
                    {route.requiredScopes.map((scope) => (
                      <Tag key={scope}>{scope}</Tag>
                    ))}
                  </Space>
                }
                title={
                  <Space size="small" wrap>
                    <Typography.Text>{route.label}</Typography.Text>
                    <Typography.Text code>{route.path}</Typography.Text>
                  </Space>
                }
              />
            </List.Item>
          )}
        />
      )}
    </Card>
  );
}
