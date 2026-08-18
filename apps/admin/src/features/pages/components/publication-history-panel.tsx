import { Table, Tag, Typography } from "antd";
import type { PageVersionSummary } from "../types";

export function PublicationHistoryPanel(props: {
  publishedVersionId: string | null;
  versions: PageVersionSummary[];
}) {
  return (
    <section
      style={{
        background: "#fff",
        border: "1px solid #eee",
        borderRadius: 8,
        marginBottom: 24,
        padding: 20,
      }}
    >
      <Typography.Title level={4}>Publication history</Typography.Title>
      <Table<PageVersionSummary>
        columns={[
          {
            dataIndex: "version",
            key: "version",
            render: (version: number, record) => (
              <Typography.Text strong={record.id === props.publishedVersionId}>
                v{version}
              </Typography.Text>
            ),
            title: "Version",
            width: 92,
          },
          {
            dataIndex: "status",
            key: "status",
            render: (status: string, record) => (
              <Tag
                color={
                  record.id === props.publishedVersionId ? "green" : "default"
                }
              >
                {record.id === props.publishedVersionId
                  ? "published"
                  : status}
              </Tag>
            ),
            title: "Status",
            width: 120,
          },
          {
            key: "author",
            render: (_, record) =>
              record.authorName ?? record.authorEmail ?? record.authorId,
            title: "Actor",
          },
          {
            dataIndex: "publishedAt",
            key: "publishedAt",
            render: (value: string | null) =>
              value ? new Date(value).toLocaleString() : "",
            title: "Published",
            width: 190,
          },
        ]}
        dataSource={props.versions}
        pagination={false}
        rowKey="id"
        size="small"
      />
    </section>
  );
}
