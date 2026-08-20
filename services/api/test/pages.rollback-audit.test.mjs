import assert from "node:assert/strict";
import test from "node:test";
import { apiErrorCodes } from "../../../packages/schema/dist/index.js";
import { createInitialPageSchema } from "../dist/modules/pages/pages.mapper.js";
import { rollbackPage } from "../dist/modules/pages/use-cases/rollback-page.js";
import { withEnv } from "./env-helper.mjs";

test("rollbackPage records source and rollback version audit metadata", async () => {
  const schema = createInitialPageSchema({
    slug: "home",
    title: "Previous Home",
  });
  const calls = { audit: null };
  const prisma = createRollbackPrisma(schema, calls);

  const response = await rollbackPage(
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
    undefined,
    "request-rollback-1",
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
  assert.equal(calls.audit.requestId, "request-rollback-1");
  assert.equal(response.meta.requestId, "request-rollback-1");
  assert.equal("schema" in calls.audit.metadata, false);
});

test("rollbackPage validates media references before creating a version", async () => {
  const schema = createInitialPageSchema({
    slug: "home",
    title: "Previous Home",
  });
  schema.sections[0].props = {
    image: "media://asset-missing",
  };
  const calls = { audit: null };
  const prisma = createRollbackPrisma(schema, calls);

  await assert.rejects(
    () =>
      rollbackPage(
        prisma,
        "page-1",
        { versionId: "version-1" },
        undefined,
        createActor(),
        undefined,
        async (validatedSchema, tenantId, client) => {
          assert.equal(validatedSchema.meta.slug, "home");
          assert.equal(tenantId, "tenant-1");
          assert.equal(typeof client.mediaAsset.findMany, "function");
          throw new Error("Missing media reference.");
        },
      ),
    /Missing media reference/,
  );

  assert.equal(calls.audit, null);
  assert.equal(calls.rollbackCreate, undefined);
});

test("rollbackPage rejects non-default locale while multi-locale is disabled", async () => {
  await withEnv(
    {
      DEFAULT_LOCALE: "en-US",
      MULTI_LOCALE_ENABLED: "false",
    },
    async () => {
      const schema = withLocale(
        createInitialPageSchema({
          slug: "home",
          title: "Previous Home",
        }),
        "de-DE",
      );
      const calls = { audit: null };
      const prisma = createRollbackPrisma(schema, calls);

      await assertApiConflictRejects(
        () =>
          rollbackPage(
            prisma,
            "page-1",
            { versionId: "version-1" },
            undefined,
            createActor(),
          ),
        apiErrorCodes.MULTI_LOCALE_DISABLED,
      );

      assert.equal(calls.audit, null);
      assert.equal(calls.rollbackCreate, undefined);
    },
  );
});

function createActor() {
  return {
    email: "admin@example.com",
    id: "user-1",
    scopes: ["page:publish"],
    tenantId: "tenant-1",
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
          create: async (input) => {
            calls.rollbackCreate = input.data;

            return {
              id: "version-rollback",
              createdAt: new Date("2026-08-18T00:00:00.000Z"),
              publishedAt: input.data.publishedAt,
              status: input.data.status,
              version: input.data.version,
            };
          },
          findFirst: async () => ({
            id: "version-1",
            pageId: "page-1",
            schema,
            status: "published",
          }),
        },
        mediaAsset: {
          findMany: async () => [],
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

async function assertApiConflictRejects(fn, expectedCode) {
  await assert.rejects(
    fn,
    (error) =>
      typeof error.getStatus === "function" &&
      error.getStatus() === 409 &&
      error.getResponse()?.code === expectedCode,
  );
}

function withLocale(schema, locale) {
  return {
    ...schema,
    meta: {
      ...schema.meta,
      locale,
    },
  };
}
