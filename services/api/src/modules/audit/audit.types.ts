export type AuditLogInput = {
  action: string;
  actorId?: string | null;
  metadata?: Record<string, unknown>;
  requestId?: string | null;
  targetId?: string | null;
  targetType: string;
  tenantId: string;
};
