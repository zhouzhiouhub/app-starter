import { Typography } from "antd";
import { DesignSystemOverview } from "../../features/design-system/components/design-system-overview";
import { readDesignSystemSummary } from "../../features/design-system/design-system-summary";

export function DesignSystemPage() {
  return (
    <div>
      <Typography.Title level={3}>Design System</Typography.Title>
      <DesignSystemOverview summary={readDesignSystemSummary()} />
    </div>
  );
}
