import { ExportOutlined } from "@ant-design/icons";
import { Button, Space, Table, Tag, Tooltip, Typography } from "antd";
import { useNavigate } from "react-router-dom";
import type { AuditLog } from "../types";

export function AuditLogTable(props: {
  isLoading: boolean;
  logs: AuditLog[];
  onPageChange: (page: number) => void;
  page: number;
  pageSize: number;
  total: number;
}) {
  return (
    <Table<AuditLog>
      columns={[
        {
          dataIndex: "createdAt",
          key: "createdAt",
          render: (value: string) => new Date(value).toLocaleString(),
          title: "Created",
          width: 190,
        },
        {
          dataIndex: "action",
          key: "action",
          render: (action: string) => (
            <Tag color={actionColor(action)}>{action}</Tag>
          ),
          title: "Action",
          width: 190,
        },
        {
          key: "target",
          render: (_, log) => <AuditTargetCell log={log} />,
          title: "Target",
          width: 260,
        },
        {
          dataIndex: "actorId",
          key: "actorId",
          render: (value: string | null) => value ?? "system",
          title: "Actor",
          width: 220,
        },
        {
          dataIndex: "requestId",
          key: "requestId",
          render: (value: string | null) => value ?? "",
          title: "Request",
          width: 140,
        },
        {
          dataIndex: "metadata",
          key: "metadata",
          render: (metadata: unknown) => (
            <Typography.Text
              code
              style={{
                display: "block",
                maxHeight: 160,
                maxWidth: 560,
                overflow: "auto",
                whiteSpace: "pre-wrap",
              }}
            >
              {formatMetadata(metadata)}
            </Typography.Text>
          ),
          title: "Metadata",
        },
      ]}
      dataSource={props.logs}
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

function AuditTargetCell(props: { log: AuditLog }) {
  const navigate = useNavigate();
  const pageTargetId =
    props.log.targetType === "page" ? props.log.targetId : null;

  return (
    <Space size={8}>
      <Typography.Text code copyable={Boolean(props.log.targetId)}>
        {formatTarget(props.log)}
      </Typography.Text>
      {pageTargetId ? (
        <Tooltip title="Open page editor">
          <Button
            aria-label="Open page editor"
            icon={<ExportOutlined />}
            onClick={() =>
              navigate(`/pages/${encodeURIComponent(pageTargetId)}`)
            }
            size="small"
            type="text"
          />
        </Tooltip>
      ) : null}
    </Space>
  );
}

function actionColor(action: string): string {
  if (action.includes("rolled_back")) {
    return "orange";
  }

  if (action.includes("published")) {
    return "green";
  }

  if (action.includes("preview")) {
    return "blue";
  }

  return "default";
}

function formatTarget(log: AuditLog): string {
  if (!log.targetId) {
    return log.targetType;
  }

  return `${log.targetType}:${log.targetId}`;
}

function formatMetadata(metadata: unknown): string {
  try {
    return JSON.stringify(metadata ?? {}, null, 2);
  } catch {
    return "{}";
  }
}
