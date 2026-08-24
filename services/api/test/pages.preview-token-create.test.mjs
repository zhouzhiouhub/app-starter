import assert from "node:assert/strict";
import test from "node:test";
import { verifyPagePreviewToken } from "../dist/modules/pages/pages.preview-token.js";
import { createPreviewToken } from "../dist/modules/pages/use-cases/create-preview-token.js";
import { withEnv } from "./env-helper.mjs";
import { createPageActor } from "./pages-test-helpers.mjs";

test("createPreviewToken signs a tenant-scoped page token", async () => {
  await withEnv({ PREVIEW_TOKEN_SECRET: "preview-secret" }, async () => {
    const auditCalls = [];
    const prisma = {
      page: {
        findFirst(query) {
          assert.deepEqual(query.where, {
            id: "page-1",
            siteId: "site-1",
          });
          assert.deepEqual(query.select, {
            id: true,
            slug: true,
          });
          return Promise.resolve({
            id: "page-1",
            slug: "campaign",
          });
        },
      },
      site: {
        findFirst() {
          return Promise.resolve({
            id: "site-1",
            tenantId: "tenant-1",
          });
        },
      },
    };
    const response = await createPreviewToken(
      prisma,
      {
        record: async (input) => auditCalls.push(input),
      },
      "page-1",
      undefined,
      createPageActor({ name: "Admin", scopes: ["page:read"] }),
      "request-preview-1",
    );

    assert.equal(response.data.slug, "campaign");
    assert.equal(typeof response.data.token, "string");
    assert.equal(
      verifyPagePreviewToken(response.data.token)?.tenantId,
      "tenant-1",
    );
    assert.equal(auditCalls.length, 1);
    assert.equal(auditCalls[0].action, "preview_token.created");
    assert.equal(auditCalls[0].actorId, "user-1");
    assert.equal(auditCalls[0].targetId, "page-1");
    assert.equal(auditCalls[0].targetType, "page");
    assert.equal(auditCalls[0].requestId, "request-preview-1");
    assert.equal(auditCalls[0].metadata.slug, "campaign");
    assert.equal(typeof auditCalls[0].metadata.expiresAt, "string");
    assert.equal("token" in auditCalls[0].metadata, false);
    assert.equal(response.meta.requestId, "request-preview-1");
  });
});

test("createPreviewToken does not store preview tokens in idempotency records", async () => {
  await withEnv({ PREVIEW_TOKEN_SECRET: "preview-secret" }, async () => {
    const auditCalls = [];
    const idempotencyCalls = [];
    let pageFinds = 0;
    let storedRecord = null;
    const prisma = {
      idempotencyRecord: {
        findUnique(options) {
          idempotencyCalls.push([
            "findUnique",
            options.where.tenantId_scope_key.scope,
          ]);
          return Promise.resolve(storedRecord);
        },
        create(options) {
          idempotencyCalls.push(["create", options.data.scope]);
          storedRecord = {
            id: "idem-1",
            requestHash: options.data.requestHash,
            response: null,
            status: "pending",
          };
          return Promise.resolve({ id: "idem-1" });
        },
        update(options) {
          idempotencyCalls.push(["update", options.data.status]);
          assert.equal("response" in options.data, false);
          storedRecord = {
            ...storedRecord,
            response: options.data.response ?? null,
            status: options.data.status,
          };
          return Promise.resolve(storedRecord);
        },
        deleteMany() {
          throw new Error("deleteMany should not run for successful preview.");
        },
      },
      page: {
        findFirst() {
          pageFinds += 1;
          return Promise.resolve({
            id: "page-1",
            slug: "campaign",
          });
        },
      },
      site: {
        findFirst() {
          return Promise.resolve({
            id: "site-1",
            tenantId: "tenant-1",
          });
        },
      },
    };
    const key = "7f10f6d3-02d9-4f3d-a69d-49b26ec63132";
    const first = await createPreviewToken(
      prisma,
      {
        record: async (input) => auditCalls.push(input),
      },
      "page-1",
      key,
      createPageActor({ name: "Admin", scopes: ["page:read"] }),
    );

    assert.equal(typeof first.data.token, "string");
    await assert.rejects(
      () =>
        createPreviewToken(
          prisma,
          {
            record: async (input) => auditCalls.push(input),
          },
          "page-1",
          key,
          createPageActor({ name: "Admin", scopes: ["page:read"] }),
        ),
      /Response for this Idempotency-Key is not replayable/,
    );
    assert.equal(pageFinds, 1);
    assert.equal(auditCalls.length, 1);
    assert.deepEqual(idempotencyCalls, [
      ["findUnique", "pages:page-1:preview-token"],
      ["create", "pages:page-1:preview-token"],
      ["update", "completed"],
      ["findUnique", "pages:page-1:preview-token"],
    ]);
  });
});

test("createPreviewToken sanitizes request ids before audit and response", async () => {
  await withEnv({ PREVIEW_TOKEN_SECRET: "preview-secret" }, async () => {
    const auditCalls = [];
    const prisma = {
      page: {
        findFirst() {
          return Promise.resolve({
            id: "page-1",
            slug: "campaign",
          });
        },
      },
      site: {
        findFirst() {
          return Promise.resolve({
            id: "site-1",
            tenantId: "tenant-1",
          });
        },
      },
    };

    const response = await createPreviewToken(
      prisma,
      {
        record: async (input) => auditCalls.push(input),
      },
      "page-1",
      undefined,
      createPageActor({ name: "Admin", scopes: ["page:read"] }),
      "request-preview-1\r\nx-secret: leaked",
    );

    assert.equal(response.meta.requestId, "local-dev");
    assert.equal(auditCalls[0].requestId, "local-dev");
  });
});
