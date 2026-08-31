import { ReloadOutlined } from "@ant-design/icons";
import { Button, Col, Row, Space, Typography } from "antd";
import { DashboardActivityPanel } from "./dashboard-activity-panel";
import { DashboardExtensionPanel } from "./dashboard-extension-panel";
import { DashboardMetricGrid } from "./dashboard-metric-grid";
import { DashboardOperationsPanel } from "./dashboard-operations-panel";
import { DashboardPublishingPanel } from "./dashboard-publishing-panel";
import type { DashboardSummary } from "../types";

export function DashboardOverview(props: {
  isRefreshing: boolean;
  onRefresh: () => void;
  summary: DashboardSummary;
}) {
  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Space
        align="start"
        style={{ justifyContent: "space-between", width: "100%" }}
        wrap
      >
        <Space direction="vertical" size={0}>
          <Typography.Title level={3} style={{ margin: 0 }}>
            Dashboard
          </Typography.Title>
          <Typography.Text type="secondary">
            {props.summary.site.name} · {props.summary.site.domain}
          </Typography.Text>
        </Space>
        <Button
          icon={<ReloadOutlined />}
          loading={props.isRefreshing}
          onClick={props.onRefresh}
        >
          Refresh
        </Button>
      </Space>

      <DashboardMetricGrid summary={props.summary} />

      <Row gutter={[16, 16]}>
        <Col lg={14} xs={24}>
          <DashboardPublishingPanel pages={props.summary.pages} />
        </Col>
        <Col lg={10} xs={24}>
          <DashboardOperationsPanel summary={props.summary} />
        </Col>
        <Col lg={14} xs={24}>
          <DashboardActivityPanel audit={props.summary.audit} />
        </Col>
        <Col lg={10} xs={24}>
          <DashboardExtensionPanel customRoutes={props.summary.customRoutes} />
        </Col>
      </Row>
    </Space>
  );
}
