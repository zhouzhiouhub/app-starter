import { AuditOutlined } from "@ant-design/icons";
import { Button, Space, Table, Tag, Tooltip, Typography } from "antd";
import { useNavigate } from "react-router-dom";
import { buildPageAuditLogPath } from "../audit-log-link";
import { getStorefrontPagePath } from "../storefront-url";
import type { PageSummary } from "../types";
import { ViewStorefrontLink } from "./view-storefront-link";

export function PageListTable(props: {
  isLoading: boolean;
  onPageChange: (page: number) => void;
  page: number;
  pages: PageSummary[];
  pageSize: number;
  total: number;
}) {
  const navigate = useNavigate();

  return (
    <Table<PageSummary>
      columns={[
        { dataIndex: "title", key: "title", title: "Title" },
        { dataIndex: "slug", key: "slug", title: "Slug" },
        {
          key: "path",
          render: (_, page) => (
            <Typography.Text code>
              {getStorefrontPagePath(page.slug)}
            </Typography.Text>
          ),
          title: "Storefront",
        },
        { dataIndex: "type", key: "type", title: "Type" },
        {
          dataIndex: "status",
          key: "status",
          render: (status: string) => (
            <Tag color={status === "published" ? "green" : "default"}>
              {status}
            </Tag>
          ),
          title: "Status",
        },
        {
          dataIndex: "updatedAt",
          key: "updatedAt",
          render: (value: string) => new Date(value).toLocaleString(),
          title: "Updated",
        },
        {
          key: "actions",
          render: (_, page) => (
            <Space>
              <Button
                onClick={() => navigate(`/pages/${page.id}`)}
                type="link"
              >
                Edit
              </Button>
              <Tooltip title="Audit logs">
                <Button
                  aria-label={`Audit logs for ${page.title}`}
                  icon={<AuditOutlined />}
                  onClick={() => navigate(buildPageAuditLogPath(page.id))}
                  type="text"
                />
              </Tooltip>
              <ViewStorefrontLink
                published={page.status === "published"}
                slug={page.slug}
              />
            </Space>
          ),
          title: "",
        },
      ]}
      dataSource={props.pages}
      loading={props.isLoading}
      pagination={{
        current: props.page,
        onChange: props.onPageChange,
        pageSize: props.pageSize,
        total: props.total,
      }}
      rowKey="id"
    />
  );
}
