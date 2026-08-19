export interface AuditLog {
  id: string;
  action: string;
  actorId: string | null;
  createdAt: string;
  metadata: unknown;
  requestId: string | null;
  targetId: string | null;
  targetType: string;
}

export interface AuditLogFilters {
  action?: string;
  actorId?: string;
  targetId?: string;
  targetType?: string;
}

export interface AuditLogListMeta {
  page: number;
  limit: number;
  total: number;
}
