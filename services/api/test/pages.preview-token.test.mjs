import assert from "node:assert/strict";
import test from "node:test";
import { createFallbackPage } from "@app-starter/schema";
import {
  createPagePreviewToken,
  verifyPagePreviewToken,
} from "../dist/modules/pages/pages.preview-token.js";
import { createPreviewToken } from "../dist/modules/pages/use-cases/create-preview-token.js";
import { getPreviewPageByToken } from "../dist/modules/pages/use-cases/get-preview-page-by-token.js";

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
      actor(),
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

test("createPreviewToken stores responses by idempotency key", async () => {
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
          assert.equal(options.data.response.data.slug, "campaign");
          storedRecord = {
            ...storedRecord,
            response: options.data.response,
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
      actor(),
    );
    const second = await createPreviewToken(
      prisma,
      {
        record: async (input) => auditCalls.push(input),
      },
      "page-1",
      key,
      actor(),
    );

    assert.equal(first.data.token, second.data.token);
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

test("getPreviewPageByToken returns the latest draft schema", async () => {
  await withEnv({ PREVIEW_TOKEN_SECRET: "preview-secret" }, async () => {
    const schema = createFallbackPage({
      slug: "campaign",
      title: "Draft Campaign",
    });
    const { token } = createPagePreviewToken({
      pageId: "page-1",
      slug: "campaign",
      tenantId: "tenant-1",
      env: process.env,
    });
    const prisma = {
      page: {
        findFirst(query) {
          assert.deepEqual(query.where, {
            id: "page-1",
            site: {
              tenantId: "tenant-1",
            },
          });
          assert.deepEqual(query.include.versions.orderBy, { version: "desc" });
          assert.equal(query.include.versions.take, 1);

          return Promise.resolve({
            id: "page-1",
            slug: "campaign",
            site: {
              id: "site-1",
              tenantId: "tenant-1",
            },
            versions: [
              {
                id: "version-2",
                schema,
                version: 2,
              },
            ],
          });
        },
      },
    };
    const response = await getPreviewPageByToken(
      prisma,
      token,
      "request-public-preview",
    );

    assert.equal(response.data.meta.title, "Draft Campaign");
    assert.equal(response.meta.requestId, "request-public-preview");
    assert.equal(response.meta.preview, true);
    assert.equal(response.meta.slug, "campaign");
  });
});

test("getPreviewPageByToken rejects malformed tokens before database lookup", async () => {
  const prisma = {
    page: {
      findFirst() {
        throw new Error("database should not be queried");
      },
    },
  };

  await assert.rejects(
    () => getPreviewPageByToken(prisma, "not a preview token"),
    /Preview token is invalid or expired/,
  );
});

function actor() {
  return {
    email: "admin@example.com",
    id: "user-1",
    name: "Admin",
    scopes: ["page:read"],
    tenantId: "tenant-1",
  };
}

async function withEnv(values, fn) {
  const previous = Object.fromEntries(
    Object.keys(values).map((key) => [key, process.env[key]]),
  );

  for (const [key, value] of Object.entries(values)) {
    process.env[key] = value;
  }

  try {
    await fn();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}
