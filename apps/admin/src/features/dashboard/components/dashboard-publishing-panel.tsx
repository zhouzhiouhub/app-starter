import { EditOutlined, FileTextOutlined } from "@ant-design/icons";
import { Button, Card, Empty, List, Space, Tag, Typography } from "antd";
import { useNavigate } from "react-router-dom";
import { readStorefrontPagePath } from "../../pages/storefront-path";
import type { PageSummary } from "../../pages/types";
import type { DashboardPagesSummary } from "../types";

export function DashboardPublishingPanel(props: {
  pages: DashboardPagesSummary;
}) {
  const navigate = useNavigate();

  return (
    <Card
      extra={
        <Button icon={<FileTextOutlined />} onClick={() => navigate("/pages")} type="link">
          Pages
        </Button>
      }
      style={{ height: "100%" }}
      title="Publishing"
    >
      {props.pages.recent.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <List
          dataSource={props.pages.recent}
          renderItem={(page) => <RecentPageItem page={page} />}
        />
      )}
    </Card>
  );
}

function RecentPageItem(props: { page: PageSummary }) {
  const navigate = useNavigate();
  const path = readStorefrontPagePath({
    locale: props.page.locale,
    slug: props.page.slug,
  });

  return (
    <List.Item
      actions={[
        <Button
          icon={<EditOutlined />}
          key="edit"
          onClick={() => navigate(`/pages/${props.page.id}`)}
          type="link"
        >
          Edit
        </Button>,
      ]}
    >
      <List.Item.Meta
        description={
          <Space size="small" wrap>
            <Typography.Text code>
              {path.ok ? path.href : props.page.slug}
            </Typography.Text>
            <Typography.Text type="secondary">
              {new Date(props.page.updatedAt).toLocaleString()}
            </Typography.Text>
          </Space>
        }
        title={
          <Space size="small" wrap>
            <Typography.Text>{props.page.title}</Typography.Text>
            <Tag color={props.page.status === "published" ? "green" : "default"}>
              {props.page.status}
            </Tag>
          </Space>
        }
      />
    </List.Item>
  );
}
