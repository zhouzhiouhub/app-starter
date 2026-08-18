import { Alert, Space, Typography } from "antd";
import { MediaListTable } from "../../features/media/components/media-list-table";
import { RegisterMediaModal } from "../../features/media/components/register-media-modal";
import { useMediaList } from "../../features/media/hooks/use-media-list";

export function MediaPage() {
  const { assets, error, isLoading, load, meta } = useMediaList();

  return (
    <div>
      <div
        style={{
          alignItems: "flex-start",
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 16,
        }}
      >
        <div>
          <Typography.Title level={3}>Media</Typography.Title>
          <Typography.Paragraph>
            Upload assets, register external media, and use their{" "}
            <Typography.Text code>media://</Typography.Text> references in page
            content.
          </Typography.Paragraph>
        </div>
        <RegisterMediaModal onCreated={() => void load(meta.page)} />
      </div>
      {error ? (
        <Alert
          message={error}
          showIcon
          style={{ marginBottom: 16 }}
          type="error"
        />
      ) : null}
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        <MediaListTable
          assets={assets}
          isLoading={isLoading}
          onPageChange={(page) => void load(page)}
          page={meta.page}
          pageSize={meta.limit}
          total={meta.total}
        />
      </Space>
    </div>
  );
}
