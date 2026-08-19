import { Alert, Space, Typography } from "antd";
import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { AuditLogFiltersBar } from "../../features/audit/components/audit-log-filters";
import { AuditLogTable } from "../../features/audit/components/audit-log-table";
import {
  buildAuditLogSearch,
  readAuditLogFilters,
  readAuditLogPage,
} from "../../features/audit/filter-query";
import { useAuditLogList } from "../../features/audit/hooks/use-audit-log-list";
import type { AuditLogFilters } from "../../features/audit/types";

export function AuditLogsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useMemo(
    () => readAuditLogFilters(searchParams),
    [searchParams],
  );
  const page = useMemo(() => readAuditLogPage(searchParams), [searchParams]);
  const setFilters = useCallback(
    (nextFilters: AuditLogFilters) => {
      setSearchParams(buildAuditLogSearch(nextFilters), { replace: true });
    },
    [setSearchParams],
  );
  const setPage = useCallback(
    (nextPage: number) => {
      setSearchParams(buildAuditLogSearch(filters, { page: nextPage }), {
        replace: true,
      });
    },
    [filters, setSearchParams],
  );
  const { error, isLoading, logs, meta } = useAuditLogList(filters, page);

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
          <Typography.Title level={3}>Audit Logs</Typography.Title>
        </div>
      </div>
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        <AuditLogFiltersBar filters={filters} onChange={setFilters} />
        {error ? <Alert message={error} showIcon type="error" /> : null}
        <AuditLogTable
          isLoading={isLoading}
          logs={logs}
          onPageChange={setPage}
          page={meta.page}
          pageSize={meta.limit}
          total={meta.total}
        />
      </Space>
    </div>
  );
}
