import "reflect-metadata";
import assert from "node:assert/strict";
import test from "node:test";
import { REQUIRE_SCOPES_KEY } from "../dist/common/require-scopes.decorator.js";
import { AuditController } from "../dist/modules/audit/audit.controller.js";
import { AuditService } from "../dist/modules/audit/audit.service.js";
import { TENANT_ADMIN_PERMISSIONS } from "../dist/modules/identity/identity.constants.js";

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
    metadata: {
      apiToken: "api-token",
      authCookie: "session=abc",
      oauthClientSecret: "client-secret",
      privateKeyPem: "private-key",
      r2AccessKeyId: "access-key",
      nested: {
        apiKey: "api-key",
        databaseUrl: "postgresql://user:secret@db.example.com/app",
        idToken: "header.payload.signature",
        note: "Authorization: Bearer header.payload.signature",
        previewApiUrl:
          "https://api.example.com/api/v1/public/preview/payload.signature",
        sentryDsn: "https://public:secret@sentry.example.com/1",
        uploadUrl:
          "https://uploads.example.com/object?X-Amz-Signature=signed-value#access_token=fragment-token",
        previewToken: "preview-token",
        publicUrl: "https://store.example.com/page?utm_source=newsletter",
        requestSignature: "signature-value",
        sessionId: "session-id",
      },
      schema: { sections: [] },
      secretAccessKey: "secret-access-key",
      slug: "campaign",
    },
    requestId: "request-1",
    targetId: "page-1",
    targetType: "page",
    tenantId: "tenant-1",
  });

  assert.deepEqual(calls[0].data, {
    action: "preview_token.created",
    actorId: "user-1",
    metadata: {
      apiToken: "[redacted]",
      authCookie: "[redacted]",
      oauthClientSecret: "[redacted]",
      privateKeyPem: "[redacted]",
      r2AccessKeyId: "[redacted]",
      nested: {
        apiKey: "[redacted]",
        databaseUrl: "[redacted]",
        idToken: "[redacted]",
        note: "Authorization: Bearer [redacted]",
        previewApiUrl:
          "https://api.example.com/api/v1/public/preview/[redacted]",
        sentryDsn: "[redacted]",
        uploadUrl:
          "https://uploads.example.com/object?X-Amz-Signature=[redacted]#access_token=[redacted]",
        previewToken: "[redacted]",
        publicUrl: "https://store.example.com/page?utm_source=newsletter",
        requestSignature: "[redacted]",
        sessionId: "[redacted]",
      },
      schema: "[redacted]",
      secretAccessKey: "[redacted]",
      slug: "campaign",
    },
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

test("audit service caps oversized metadata before storage", async () => {
  const calls = [];
  const service = new AuditService({
    auditLog: {
      create: async (query) => {
        calls.push(query);
      },
    },
  });

  await service.record({
    action: "page.published",
    metadata: {
      fields: Object.fromEntries(
        Array.from({ length: 52 }, (_value, index) => [
          `field${index}`,
          `value-${index}`,
        ]),
      ),
      longNote: `Authorization: Bearer header.payload.signature ${"a".repeat(
        1_200,
      )}`,
      nested: {
        child: {
          child: {
            child: {
              child: {
                child: {
                  child: { value: "too deep" },
                },
              },
            },
          },
        },
      },
      previewToken: "preview-token",
      steps: Array.from({ length: 52 }, (_value, index) => ({
        index,
        secret: `secret-${index}`,
      })),
    },
    targetType: "page",
    tenantId: "tenant-1",
  });

  const metadata = calls[0].data.metadata;

  assert.equal(metadata.previewToken, "[redacted]");
  assert.equal(metadata.fields.field0, "value-0");
  assert.equal(metadata.fields.field49, "value-49");
  assert.equal(metadata.fields.field50, undefined);
  assert.equal(
    metadata.fields.__metadataTruncated,
    "[truncated]: 2 more field(s)",
  );
  assert.equal(metadata.steps.length, 51);
  assert.equal(metadata.steps[0].secret, "[redacted]");
  assert.equal(metadata.steps[49].secret, "[redacted]");
  assert.equal(metadata.steps[50], "[truncated]: 2 more item(s)");
  assert.match(metadata.longNote, /Authorization: Bearer \[redacted\]/);
  assert.equal(metadata.longNote.includes("header.payload.signature"), false);
  assert.equal(metadata.longNote.endsWith("[truncated]"), true);
  assert.equal(
    metadata.nested.child.child.child.child.child,
    "[truncated]",
  );
});

test("audit service lists tenant-scoped logs with filters and pagination", async () => {
  const calls = {};
  const createdAt = new Date("2026-08-19T00:00:00.000Z");
  const service = new AuditService({
    $transaction: async (operations) => Promise.all(operations),
    auditLog: {
      count: async (query) => {
        calls.count = query;
        return 1;
      },
      findMany: async (query) => {
        calls.findMany = query;
        return [
          {
            id: "audit-1",
            action: "page.published",
            actorId: "user-1",
            createdAt,
            metadata: {
              apiToken: "api-token",
              detail:
                "Preview URL /api/v1/public/preview/payload.signature",
              nested: { previewToken: "preview-token" },
              schema: { sections: [] },
              siteId: "site-1",
              slug: "home",
              token: "secret-token",
            },
            requestId: "request-1",
            targetId: "page-1",
            targetType: "page",
            tenantId: "tenant-1",
          },
        ];
      },
    },
  });

  const response = await service.list(
    {
      action: "page.published",
      actorId: "user-1",
      limit: "10",
      page: "2",
      targetId: "page-1",
      targetType: "page",
    },
    { tenantId: "tenant-1" },
    "request-audit-list",
  );

  assert.deepEqual(calls.count.where, {
    action: "page.published",
    actorId: "user-1",
    targetId: "page-1",
    targetType: "page",
    tenantId: "tenant-1",
  });
  assert.equal(calls.findMany.skip, 10);
  assert.equal(calls.findMany.take, 10);
  assert.deepEqual(calls.findMany.orderBy, { createdAt: "desc" });
  assert.equal(response.meta.total, 1);
  assert.equal(response.meta.page, 2);
  assert.equal(response.meta.requestId, "request-audit-list");
  assert.equal(response.data[0].createdAt, "2026-08-19T00:00:00.000Z");
  assert.equal(response.data[0].metadata.slug, "home");
  assert.equal(response.data[0].metadata.apiToken, "[redacted]");
  assert.equal(
    response.data[0].metadata.detail,
    "Preview URL /api/v1/public/preview/[redacted]",
  );
  assert.equal(response.data[0].metadata.nested.previewToken, "[redacted]");
  assert.equal(response.data[0].metadata.schema, "[redacted]");
  assert.equal(response.data[0].metadata.token, "[redacted]");
});

test("audit log query rejects unsafe filter values", async () => {
  const service = new AuditService({});

  await assert.rejects(
    () =>
      service.list({ action: "page.published;drop" }, { tenantId: "tenant-1" }),
    (error) => {
      assert.equal(error.getStatus(), 400);
      assert.equal(error.getResponse().code, "VALIDATION_ERROR");
      return true;
    },
  );
});

test("audit log endpoint requires audit read scope", () => {
  const scopes = Reflect.getMetadata(
    REQUIRE_SCOPES_KEY,
    AuditController.prototype.list,
  );

  assert.deepEqual(scopes, ["audit:read"]);
  assert.equal(TENANT_ADMIN_PERMISSIONS.includes("audit:read"), true);
});
