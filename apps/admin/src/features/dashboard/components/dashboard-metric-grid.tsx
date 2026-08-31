import {
  AuditOutlined,
  FileTextOutlined,
  GlobalOutlined,
  PictureOutlined,
} from "@ant-design/icons";
import { Card, Col, Row, Statistic, Tag } from "antd";
import type { DashboardSummary } from "../types";

export function DashboardMetricGrid(props: { summary: DashboardSummary }) {
  const { localization, media, pages } = props.summary;

  return (
    <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
      <Col lg={6} md={12} xs={24}>
        <Card style={{ height: "100%" }}>
          <Statistic
            prefix={<FileTextOutlined />}
            title="Pages"
            value={pages.total}
          />
          <Tag color={pages.hasMoreStatusRows ? "gold" : "green"}>
            {pages.statusSampleSize} checked
          </Tag>
        </Card>
      </Col>
      <Col lg={6} md={12} xs={24}>
        <Card style={{ height: "100%" }}>
          <Statistic
            prefix={<AuditOutlined />}
            title="Published"
            value={pages.publishedCount}
          />
          <Tag color={pages.unpublishedCount > 0 ? "gold" : "green"}>
            {pages.unpublishedCount} unpublished
          </Tag>
        </Card>
      </Col>
      <Col lg={6} md={12} xs={24}>
        <Card style={{ height: "100%" }}>
          <Statistic
            prefix={<PictureOutlined />}
            title="Media"
            value={media.total}
          />
          <Tag color="green">{media.activeCount} active</Tag>
        </Card>
      </Col>
      <Col lg={6} md={12} xs={24}>
        <Card style={{ height: "100%" }}>
          <Statistic
            prefix={<GlobalOutlined />}
            title="Missing keys"
            value={localization.missingKeyCount}
          />
          <Tag color={localization.status === "complete" ? "green" : "gold"}>
            {localization.primaryLocale}
          </Tag>
        </Card>
      </Col>
    </Row>
  );
}
