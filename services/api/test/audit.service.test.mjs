import assert from "node:assert/strict";
import test from "node:test";
import { AuditService } from "../dist/modules/audit/audit.service.js";

test("audit service appends audit log records", async () => {
  const calls = [];
  const service = new AuditService({
    auditLog: {
      create: async (query) => {
        calls.push(query);
      },
    },
  });

  await service.record({
    action: "preview_token.created",
    actorId: "user-1",
    metadata: { slug: "campaign" },
    requestId: "request-1",
    targetId: "page-1",
    targetType: "page",
    tenantId: "tenant-1",
  });

  assert.deepEqual(calls[0].data, {
    action: "preview_token.created",
    actorId: "user-1",
    metadata: { slug: "campaign" },
    requestId: "request-1",
    targetId: "page-1",
    targetType: "page",
    tenantId: "tenant-1",
  });
});

test("audit service allows system actors and empty metadata", async () => {
  const calls = [];
  const service = new AuditService({
    auditLog: {
      create: async (query) => {
        calls.push(query);
      },
    },
  });

  await service.record({
    action: "system.checked",
    targetType: "system",
    tenantId: "tenant-1",
  });

  assert.deepEqual(calls[0].data, {
    action: "system.checked",
    actorId: null,
    metadata: {},
    requestId: null,
    targetId: null,
    targetType: "system",
    tenantId: "tenant-1",
  });
});
