export type AuditLogInput = {
  action: string;
  actorId?: string | null;
  metadata?: Record<string, unknown>;
  requestId?: string | null;
  targetId?: string | null;
  targetType: string;
  tenantId: string;
};

export type AuditLogResponse = {
  id: string;
  action: string;
  actorId: string | null;
  createdAt: string;
  metadata: unknown;
  requestId: string | null;
  targetId: string | null;
  targetType: string;
};

export type ListAuditLogsQuery = {
  action?: string;
  actorId?: string;
  limit?: string | number;
  page?: string | number;
  targetId?: string;
  targetType?: string;
};
