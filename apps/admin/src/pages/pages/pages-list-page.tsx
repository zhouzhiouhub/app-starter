import { Alert, Space, Typography } from "antd";
import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { CreatePageModal } from "../../features/pages/components/create-page-modal";
import { PageListTable } from "../../features/pages/components/page-list-table";
import { usePageList } from "../../features/pages/hooks/use-page-list";
import {
  buildPageListSearch,
  readPageListPage,
} from "../../features/pages/page-list-query";

export function PagesListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = useMemo(() => readPageListPage(searchParams), [searchParams]);
  const setPage = useCallback(
    (nextPage: number) => {
      setSearchParams(buildPageListSearch(nextPage), { replace: true });
    },
    [setSearchParams],
  );
  const { error, isLoading, meta, pages } = usePageList(page);

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
            Create landing, policy, and system pages, then open Page Builder.
            Home is <Typography.Text code>/en</Typography.Text>. A page with
            slug <Typography.Text code>faq</Typography.Text> is{" "}
            <Typography.Text code>/en/faq</Typography.Text>.
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
          onPageChange={setPage}
          page={meta.page}
          pageSize={meta.limit}
          pages={pages}
          total={meta.total}
        />
      </Space>
    </div>
  );
}
