import {
  CheckCircleOutlined,
  SafetyCertificateOutlined,
  TagsOutlined,
} from "@ant-design/icons";
import { Card, Col, Descriptions, Row, Space, Statistic, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import type {
  AnalyticsProviderStatus,
  AnalyticsSettingsSummary,
} from "../types";

export function AnalyticsOverview(props: { summary: AnalyticsSettingsSummary }) {
  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Row gutter={[16, 16]}>
        <Col md={8} xs={24}>
          <Card>
            <Statistic
              prefix={<CheckCircleOutlined />}
              title="Analytics"
              value={props.summary.enabled ? "on" : "off"}
            />
          </Card>
        </Col>
        <Col md={8} xs={24}>
          <Card>
            <Statistic
              prefix={<TagsOutlined />}
              title="Providers"
              value={props.summary.configuredProviderCount}
            />
          </Card>
        </Col>
        <Col md={8} xs={24}>
          <Card>
            <Statistic
              prefix={<SafetyCertificateOutlined />}
              title="Consent"
              value={props.summary.consentGranted ? "granted" : "pending"}
            />
          </Card>
        </Col>
      </Row>

      <Card title="Runtime Defaults">
        <Descriptions
          items={[
            {
              children: <Tag>{props.summary.market}</Tag>,
              key: "market",
              label: "Market",
            },
            {
              children: <Tag>{props.summary.locale}</Tag>,
              key: "locale",
              label: "Locale",
            },
            {
              children: (
                <Tag color={props.summary.consentGranted ? "green" : "default"}>
                  {props.summary.consentGranted ? "granted" : "pending"}
                </Tag>
              ),
              key: "consent",
              label: "Consent",
            },
          ]}
        />
      </Card>

      <Card title="Provider Configuration">
        <Table<AnalyticsProviderStatus>
          columns={providerColumns}
          dataSource={props.summary.providers}
          pagination={false}
          rowKey="key"
        />
      </Card>
    </Space>
  );
}

const providerColumns: ColumnsType<AnalyticsProviderStatus> = [
  {
    dataIndex: "label",
    key: "label",
    title: "Provider",
  },
  {
    key: "configured",
    render: (_, provider) => (
      <Tag color={provider.configured ? "green" : "default"}>
        {provider.configured ? "configured" : "empty"}
      </Tag>
    ),
    title: "Status",
  },
];
