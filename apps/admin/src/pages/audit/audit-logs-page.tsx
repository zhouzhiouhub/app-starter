import { Alert, Space, Typography } from "antd";
import { useState } from "react";
import { AuditLogFiltersBar } from "../../features/audit/components/audit-log-filters";
import { AuditLogTable } from "../../features/audit/components/audit-log-table";
import { useAuditLogList } from "../../features/audit/hooks/use-audit-log-list";
import type { AuditLogFilters } from "../../features/audit/types";

export function AuditLogsPage() {
  const [filters, setFilters] = useState<AuditLogFilters>({});
  const { error, isLoading, load, logs, meta } = useAuditLogList(filters);

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
          onPageChange={(page) => void load(page)}
          page={meta.page}
          pageSize={meta.limit}
          total={meta.total}
        />
      </Space>
    </div>
  );
}
