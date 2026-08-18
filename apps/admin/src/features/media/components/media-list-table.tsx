import { CopyOutlined, LinkOutlined } from "@ant-design/icons";
import { Button, Image, Space, Table, Tag, Tooltip, Typography } from "antd";
import type { MediaAsset } from "../types";

export function MediaListTable(props: {
  assets: MediaAsset[];
  isLoading: boolean;
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
          dataIndex: "createdAt",
          key: "createdAt",
          render: (value: string) => new Date(value).toLocaleString(),
          title: "Created",
          width: 190,
        },
        {
          key: "actions",
          render: (_, asset) => (
            <Space>
              <Tooltip title="Open asset URL">
                <Button
                  href={asset.url}
                  icon={<LinkOutlined />}
                  target="_blank"
                  type="link"
                />
              </Tooltip>
              <Tooltip title="Copy media reference">
                <Button
                  icon={<CopyOutlined />}
                  onClick={() => void copyText(asset.reference)}
                  type="text"
                />
              </Tooltip>
            </Space>
          ),
          title: "",
          width: 112,
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

function MediaPreview(props: { asset: MediaAsset }) {
  if (props.asset.type === "image") {
    return (
      <Image
        alt={props.asset.filename}
        height={56}
        src={props.asset.url}
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
