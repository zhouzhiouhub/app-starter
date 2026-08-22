import { Alert, Button, Spin, Space, Typography } from "antd";
import { SiteSettingsForm } from "../../features/site-settings/components/site-settings-form";
import { useSiteSettings } from "../../features/site-settings/hooks/use-site-settings";

export function SettingsPage() {
  const { error, feedback, isLoading, isSaving, load, save, settings } =
    useSiteSettings();

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
          <Typography.Title level={3}>Settings</Typography.Title>
          <Typography.Paragraph>
            Manage the default site and MVP runtime defaults.
          </Typography.Paragraph>
        </div>
        <Button onClick={() => void load()}>Refresh</Button>
      </div>
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        {error ? <Alert message={error} showIcon type="error" /> : null}
        {feedback ? <Alert message={feedback} showIcon type="success" /> : null}
        {isLoading ? (
          <div style={{ padding: 48, textAlign: "center" }}>
            <Spin />
          </div>
        ) : settings ? (
          <SiteSettingsForm
            isSaving={isSaving}
            onSave={(values) => void save(values)}
            settings={settings}
          />
        ) : null}
      </Space>
    </div>
  );
}
