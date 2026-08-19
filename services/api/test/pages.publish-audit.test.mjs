import assert from "node:assert/strict";
import test from "node:test";
import { createInitialPageSchema } from "../dist/modules/pages/pages.mapper.js";
import { publishPage } from "../dist/modules/pages/use-cases/publish-page.js";
import { rollbackPage } from "../dist/modules/pages/use-cases/rollback-page.js";

test("publishPage records a page published audit log", async () => {
  const schema = createInitialPageSchema({
    slug: "launch",
    title: "Launch",
  });
  const calls = { audit: null };
  const prisma = createPublishPrisma(calls);

  await publishPage(
    prisma,
    "page-1",
    schema,
    undefined,
    createActor(),
    async () => ({
      paths: ["/en/launch"],
      tags: ["published-page"],
      triggered: true,
    }),
  );

  assert.equal(calls.audit.action, "page.published");
  assert.equal(calls.audit.actorId, "user-1");
  assert.equal(calls.audit.targetId, "page-1");
  assert.equal(calls.audit.targetType, "page");
  assert.equal(calls.audit.tenantId, "tenant-1");
  assert.equal(calls.audit.metadata.siteId, "site-1");
  assert.equal(calls.audit.metadata.slug, "launch");
  assert.equal(calls.audit.metadata.market, "us");
  assert.equal(calls.audit.metadata.locale, "en-US");
  assert.equal(calls.audit.metadata.publishedVersionId, "version-2");
  assert.equal("schema" in calls.audit.metadata, false);
});

test("rollbackPage records source and rollback version audit metadata", async () => {
  const schema = createInitialPageSchema({
    slug: "home",
    title: "Previous Home",
  });
  const calls = { audit: null };
  const prisma = createRollbackPrisma(schema, calls);

  await rollbackPage(
    prisma,
    "page-1",
    { versionId: "version-1" },
    undefined,
    createActor(),
    async () => ({
      paths: ["/en"],
      tags: ["published-page"],
      triggered: true,
    }),
  );

  assert.equal(calls.audit.action, "page.rolled_back");
  assert.equal(calls.audit.actorId, "user-1");
  assert.equal(calls.audit.targetId, "page-1");
  assert.equal(calls.audit.targetType, "page");
  assert.equal(calls.audit.tenantId, "tenant-1");
  assert.equal(calls.audit.metadata.siteId, "site-1");
  assert.equal(calls.audit.metadata.slug, "home");
  assert.equal(calls.audit.metadata.rollbackVersionId, "version-rollback");
  assert.equal(calls.audit.metadata.targetVersionId, "version-1");
  assert.equal("schema" in calls.audit.metadata, false);
});

function createActor() {
  return {
    email: "admin@example.com",
    id: "user-1",
    scopes: ["page:publish"],
    tenantId: "tenant-1",
  };
}

function createPublishPrisma(calls) {
  return {
    $transaction: async (fn) =>
      fn({
        auditLog: {
          create: async (input) => {
            calls.audit = input.data;
            return {};
          },
        },
        page: {
          findFirst: async () => ({
            id: "page-1",
            siteId: "site-1",
            slug: "launch",
            versions: [
              { id: "version-1", status: "published", version: 1 },
            ],
          }),
          update: async () => ({}),
        },
        pageVersion: {
          create: async (input) => ({
            id: "version-2",
            createdAt: new Date("2026-08-18T00:00:00.000Z"),
            publishedAt: input.data.publishedAt,
            status: input.data.status,
            version: input.data.version,
          }),
        },
      }),
    site: {
      findFirst: async () => ({
        id: "site-1",
        tenantId: "tenant-1",
      }),
    },
  };
}

function createRollbackPrisma(schema, calls) {
  return {
    $transaction: async (fn) =>
      fn({
        auditLog: {
          create: async (input) => {
            calls.audit = input.data;
            return {};
          },
        },
        page: {
          findFirst: async () => ({
            id: "page-1",
            siteId: "site-1",
            slug: "home",
            versions: [
              { id: "version-latest", status: "published", version: 3 },
            ],
          }),
          update: async () => ({}),
        },
        pageVersion: {
          create: async (input) => ({
            id: "version-rollback",
            createdAt: new Date("2026-08-18T00:00:00.000Z"),
            publishedAt: input.data.publishedAt,
            status: input.data.status,
            version: input.data.version,
          }),
          findFirst: async () => ({
            id: "version-1",
            pageId: "page-1",
            schema,
            status: "published",
          }),
        },
      }),
    site: {
      findFirst: async () => ({
        id: "site-1",
        tenantId: "tenant-1",
      }),
    },
  };
}
