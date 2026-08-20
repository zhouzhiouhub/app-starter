import assert from "node:assert/strict";
import test from "node:test";
import { apiErrorCodes } from "../../../packages/schema/dist/index.js";
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

test("publishPage rejects non-default locale while multi-locale is disabled", async () => {
  await withEnv(
    {
      DEFAULT_LOCALE: "en-US",
      MULTI_LOCALE_ENABLED: "false",
    },
    async () => {
      const schema = withLocale(
        createInitialPageSchema({
          slug: "launch",
          title: "Launch",
        }),
        "de-DE",
      );
      const calls = { audit: null };
      const prisma = createPublishPrisma(calls);

      await assertApiConflictRejects(
        () => publishPage(prisma, "page-1", schema, undefined, createActor()),
        apiErrorCodes.MULTI_LOCALE_DISABLED,
      );

      assert.equal(calls.audit, null);
      assert.equal(calls.versionCreate, undefined);
    },
  );
});

test("publishPage ignores invalid default locale configuration", async () => {
  await withEnv(
    {
      DEFAULT_LOCALE: "bad_locale",
      MULTI_LOCALE_ENABLED: "false",
    },
    async () => {
      const schema = createInitialPageSchema({
        slug: "launch",
        title: "Launch",
      });
      const calls = { audit: null };
      const prisma = createPublishPrisma(calls);

      await publishPage(prisma, "page-1", schema, undefined, createActor());

      assert.equal(calls.versionCreate.status, "published");
      assert.equal(calls.audit.action, "page.published");
    },
  );
});

test("publishPage validates media references before creating a version", async () => {
  const schema = createInitialPageSchema({
    slug: "launch",
    title: "Launch",
  });
  schema.sections[0].props = {
    image: "media://asset-missing",
  };
  const calls = { audit: null };
  const prisma = createPublishPrisma(calls);

  await assert.rejects(
    () =>
      publishPage(
        prisma,
        "page-1",
        schema,
        undefined,
        createActor(),
        undefined,
        async (validatedSchema, tenantId, client) => {
          assert.equal(validatedSchema.meta.slug, "launch");
          assert.equal(
            validatedSchema.sections[0].props.image,
            "media://asset-missing",
          );
          assert.equal(tenantId, "tenant-1");
          assert.equal(typeof client.mediaAsset.findMany, "function");
          throw new Error("Missing media reference.");
        },
      ),
    /Missing media reference/,
  );

  assert.equal(calls.audit, null);
  assert.equal(calls.versionCreate, undefined);
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
            versions: [{ id: "version-1", status: "published", version: 1 }],
          }),
          update: async () => ({}),
        },
        pageVersion: {
          create: async (input) => {
            calls.versionCreate = input.data;

            return {
              id: "version-2",
              createdAt: new Date("2026-08-18T00:00:00.000Z"),
              publishedAt: input.data.publishedAt,
              status: input.data.status,
              version: input.data.version,
            };
          },
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
