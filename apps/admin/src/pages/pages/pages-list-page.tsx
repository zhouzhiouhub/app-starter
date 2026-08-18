import { Alert, Space, Typography } from "antd";
import { CreatePageModal } from "../../features/pages/components/create-page-modal";
import { PageListTable } from "../../features/pages/components/page-list-table";
import { usePageList } from "../../features/pages/hooks/use-page-list";

export function PagesListPage() {
  const { error, isLoading, load, meta, pages } = usePageList();

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
          <Typography.Title level={3}>Pages</Typography.Title>
          <Typography.Paragraph>
            Create landing, policy, and system pages, then open Page Builder to
            edit chrome and publish.
          </Typography.Paragraph>
        </div>
        <CreatePageModal />
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
        <PageListTable
          isLoading={isLoading}
          onPageChange={(page) => void load(page)}
          page={meta.page}
          pageSize={meta.limit}
          pages={pages}
          total={meta.total}
        />
      </Space>
    </div>
  );
}
