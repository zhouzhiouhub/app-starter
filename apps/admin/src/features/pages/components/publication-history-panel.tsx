import { RollbackOutlined } from "@ant-design/icons";
import { Alert, Button, Modal, Table, Tag, Tooltip, Typography } from "antd";
import type { PageVersionListMeta, PageVersionSummary } from "../types";

export function PublicationHistoryPanel(props: {
  error: string | null;
  isLoading: boolean;
  meta: PageVersionListMeta;
  onPageChange: (page: number) => void | Promise<void>;
  onRollbackVersion: (versionId: string) => void | Promise<void>;
  publishedVersionId: string | null;
  rollingBackVersionId: string | null;
  versions: PageVersionSummary[];
}) {
  const confirmRollback = (record: PageVersionSummary) => {
    Modal.confirm({
      content:
        "This will publish a new version using the selected version content.",
      okText: "Rollback",
      onOk: () => props.onRollbackVersion(record.id),
      title: `Rollback to v${record.version}?`,
    });
  };

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
      {props.error ? (
        <Alert
          message={props.error}
          showIcon
          style={{ marginBottom: 12 }}
          type="warning"
        />
      ) : null}
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
          {
            align: "right",
            key: "actions",
            render: (_, record) => {
              const isCurrent = record.id === props.publishedVersionId;
              const canRollback = record.status === "published" && !isCurrent;

              return (
                <Tooltip
                  title={
                    canRollback
                      ? "Rollback to this version"
                      : "Only previous published versions can be rolled back"
                  }
                >
                  <Button
                    aria-label={`Rollback to version ${record.version}`}
                    disabled={!canRollback}
                    icon={<RollbackOutlined />}
                    loading={props.rollingBackVersionId === record.id}
                    onClick={() => confirmRollback(record)}
                    size="small"
                    type="text"
                  />
                </Tooltip>
              );
            },
            title: "",
            width: 72,
          },
        ]}
        dataSource={props.versions}
        loading={props.isLoading}
        pagination={{
          current: props.meta.page,
          pageSize: props.meta.limit,
          showSizeChanger: false,
          total: props.meta.total,
          onChange: props.onPageChange,
        }}
        rowKey="id"
        size="small"
      />
    </section>
  );
}
