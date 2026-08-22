import { CopyOutlined, DeleteOutlined, LinkOutlined } from "@ant-design/icons";
import { Button, Image, Space, Table, Tag, Tooltip, Typography } from "antd";
import { readSafeMediaAssetUrl } from "../media-asset-url";
import type { MediaAsset } from "../types";

export function MediaListTable(props: {
  archivingId: string | null;
  assets: MediaAsset[];
  isLoading: boolean;
  onArchive: (asset: MediaAsset) => void;
  onPageChange: (page: number) => void;
  page: number;
  pageSize: number;
  total: number;
}) {
  return (
    <Table<MediaAsset>
      columns={[
        {
          key: "preview",
          render: (_, asset) => <MediaPreview asset={asset} />,
          title: "Preview",
          width: 96,
        },
        { dataIndex: "filename", key: "filename", title: "Filename" },
        {
          dataIndex: "type",
          key: "type",
          render: (type: string) => <Tag>{type}</Tag>,
          title: "Type",
          width: 100,
        },
        {
          dataIndex: "size",
          key: "size",
          render: (size: number) => formatBytes(size),
          title: "Size",
          width: 120,
        },
        {
          dataIndex: "status",
          key: "status",
          render: (status: string) => (
            <Tag color={status === "active" ? "green" : "default"}>
              {status}
            </Tag>
          ),
          title: "Status",
          width: 110,
        },
        {
          dataIndex: "reference",
          key: "reference",
          render: (reference: string) => (
            <Typography.Text code copyable>
              {reference}
            </Typography.Text>
          ),
          title: "Reference",
        },
        {
          dataIndex: "archivedAt",
          key: "archivedAt",
          render: (value: string | null) =>
            value ? new Date(value).toLocaleString() : "",
          title: "Archived",
          width: 190,
        },
        {
          dataIndex: "createdAt",
          key: "createdAt",
          render: (value: string) => new Date(value).toLocaleString(),
          title: "Created",
          width: 190,
        },
        {
          key: "actions",
          render: (_, asset) => (
            <MediaActions
              archivingId={props.archivingId}
              asset={asset}
              onArchive={props.onArchive}
            />
          ),
          title: "",
          width: 160,
        },
      ]}
      dataSource={props.assets}
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

function MediaActions(props: {
  archivingId: string | null;
  asset: MediaAsset;
  onArchive: (asset: MediaAsset) => void;
}) {
  const safeAssetUrl = readSafeMediaAssetUrl(props.asset.url);

  return (
    <Space>
      <Tooltip
        title={safeAssetUrl ? "Open asset URL" : "Asset URL unavailable"}
      >
        <Button
          disabled={!safeAssetUrl}
          href={safeAssetUrl ?? undefined}
          icon={<LinkOutlined />}
          rel="noopener noreferrer"
          target="_blank"
          type="link"
        />
      </Tooltip>
      <Tooltip title="Copy media reference">
        <Button
          icon={<CopyOutlined />}
          onClick={() => void copyText(props.asset.reference)}
          type="text"
        />
      </Tooltip>
      <Tooltip title="Archive asset">
        <Button
          danger
          disabled={props.asset.status !== "active"}
          icon={<DeleteOutlined />}
          loading={props.archivingId === props.asset.id}
          onClick={() => props.onArchive(props.asset)}
          type="text"
        />
      </Tooltip>
    </Space>
  );
}

function MediaPreview(props: { asset: MediaAsset }) {
  const safeAssetUrl = readSafeMediaAssetUrl(props.asset.url);

  if (props.asset.type === "image" && safeAssetUrl) {
    return (
      <Image
        alt={props.asset.filename}
        height={56}
        src={safeAssetUrl}
        style={{ objectFit: "cover" }}
        width={72}
      />
    );
  }

  return <Tag>{props.asset.type.toUpperCase()}</Tag>;
}

function formatBytes(value: number): string {
  if (value < 1024) {
    return `${value} B`;
  }

  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }

  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

async function copyText(value: string) {
  await navigator.clipboard?.writeText(value);
}
