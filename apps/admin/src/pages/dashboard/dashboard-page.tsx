import { Alert, Button, Typography } from "antd";
import { useNavigate } from "react-router-dom";
import { customAdminRoutes } from "@app-starter/custom-admin";

export function DashboardPage() {
  const navigate = useNavigate();

  return (
    <div>
      <Typography.Title level={3}>Dashboard</Typography.Title>
      <Typography.Paragraph>
        Phase 1 is site-building first. Create and publish pages from the Pages
        module.
      </Typography.Paragraph>
      <Alert
        action={
          <Button onClick={() => navigate("/pages")} type="primary">
            Open pages
          </Button>
        }
        message="Page list, create page, draft save, and publish are available."
        showIcon
        style={{ marginBottom: 24 }}
        type="info"
      />
      <Typography.Title level={4}>Custom admin routes</Typography.Title>
      <pre>{JSON.stringify(customAdminRoutes, null, 2)}</pre>
    </div>
  );
}
