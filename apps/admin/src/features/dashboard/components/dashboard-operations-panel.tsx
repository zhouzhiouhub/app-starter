import { SettingOutlined } from "@ant-design/icons";
import { Button, Card, Descriptions, Space, Tag, Typography } from "antd";
import { useNavigate } from "react-router-dom";
import type { DashboardSummary } from "../types";

export function DashboardOperationsPanel(props: { summary: DashboardSummary }) {
  const navigate = useNavigate();
  const { localization, site } = props.summary;

  return (
    <Card
      extra={
        <Button
          icon={<SettingOutlined />}
          onClick={() => navigate("/settings")}
          type="link"
        >
          Settings
        </Button>
      }
      style={{ height: "100%" }}
      title="Operations"
    >
      <Descriptions
        column={1}
        items={[
          {
            children: <Typography.Text>{site.domain}</Typography.Text>,
            key: "domain",
            label: "Domain",
          },
          {
            children: (
              <Space size="small" wrap>
                <Tag>{site.market}</Tag>
                <Tag>{site.locale}</Tag>
                <Tag>{site.currency}</Tag>
              </Space>
            ),
            key: "defaults",
            label: "Defaults",
          },
          {
            children: (
              <Space size="small" wrap>
                <Tag color={site.commerceEnabled ? "green" : "default"}>
                  Commerce {site.commerceEnabled ? "on" : "off"}
                </Tag>
                <Tag color={site.multiLocaleEnabled ? "green" : "default"}>
                  Multi-locale {site.multiLocaleEnabled ? "on" : "off"}
                </Tag>
                <Tag color={site.analyticsEnabled ? "green" : "default"}>
                  Analytics {site.analyticsEnabled ? "on" : "off"}
                </Tag>
              </Space>
            ),
            key: "flags",
            label: "Flags",
          },
          {
            children: (
              <Space size="small" wrap>
                <Tag
                  color={
                    localization.status === "complete" ? "green" : "orange"
                  }
                >
                  {localization.status}
                </Tag>
                <Typography.Text type="secondary">
                  {localization.activeLocaleCount} locale,{" "}
                  {localization.activeMarketCount} market
                </Typography.Text>
              </Space>
            ),
            key: "localization",
            label: "Localization",
          },
        ]}
      />
    </Card>
  );
}
