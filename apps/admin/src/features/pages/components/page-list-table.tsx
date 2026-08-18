import { Button, Table, Tag } from "antd";
import { useNavigate } from "react-router-dom";
import type { PageSummary } from "../types";

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
            <Button
              onClick={() => navigate(`/pages/${page.id}`)}
              type="link"
            >
              Edit
            </Button>
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
