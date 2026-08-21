import assert from "node:assert/strict";
import test from "node:test";
import { createInitialPageSchema } from "../dist/modules/pages/pages.mapper.js";
import { publishPage } from "../dist/modules/pages/use-cases/publish-page.js";
import { rollbackPage } from "../dist/modules/pages/use-cases/rollback-page.js";
import { persistRollbackVersion } from "../dist/modules/pages/pages.versions.js";
import {
  createPageActor,
  createPageVersionResult,
} from "./pages-test-helpers.mjs";

test("persistRollbackVersion creates a published snapshot from target content", async () => {
  const schema = createInitialPageSchema({
    slug: "home",
    title: "Previous Home",
  });
  const created = await persistRollbackVersion(
    {
      pageVersion: {
        create: async (input) => {
          assert.equal(input.data.authorId, "user-1");
          assert.equal(input.data.pageId, "page-1");
          assert.equal(input.data.schema, schema);
          assert.equal(input.data.status, "published");
          assert.equal(input.data.version, 4);
          assert.ok(input.data.publishedAt instanceof Date);

          return createPageVersionResult(input, { id: "version-rollback" });
        },
      },
    },
    {
      authorId: "user-1",
      latest: { version: 3 },
      pageId: "page-1",
      target: { schema },
    },
  );

  assert.equal(created.id, "version-rollback");
  assert.equal(created.version, 4);
});

test("rollbackPage publishes a new version using the selected version schema", async () => {
  const schema = createInitialPageSchema({
    slug: "home",
    title: "Previous Home",
  });
  const calls = {
    createdVersion: null,
    pageUpdate: null,
    revalidation: null,
  };
  const prisma = createRollbackPrisma({
    onCreateVersion: (input) => {
      calls.createdVersion = input.data;
      return createPageVersionResult(input, { id: "version-rollback" });
    },
    onUpdatePage: (input) => {
      calls.pageUpdate = input.data;
      return {};
    },
    target: {
      id: "version-1",
      pageId: "page-1",
      schema,
      status: "published",
    },
  });

  const result = await rollbackPage(
    prisma,
    "page-1",
    { versionId: "version-1" },
    undefined,
    createPageActor(),
    async (input) => {
      calls.revalidation = input;
      return { paths: ["/", "/en"], tags: ["published-page"], triggered: true };
    },
  );

  assert.equal(result.data.meta.slug, "home");
  assert.equal(result.data.meta.title, "Previous Home");
  assert.equal(result.meta.tenantId, "tenant-1");
  assert.equal(calls.createdVersion.authorId, "user-1");
  assert.equal(calls.createdVersion.schema, schema);
  assert.equal(calls.createdVersion.version, 4);
  assert.equal(calls.pageUpdate.publishedVersionId, "version-rollback");
  assert.equal(calls.pageUpdate.status, "published");
  assert.equal(calls.pageUpdate.title, "Previous Home");
  assert.deepEqual(calls.revalidation, {
    locale: "en-US",
    market: "us",
    slug: "home",
  });
  assert.equal(result.meta.revalidation.triggered, true);
});

test("publishPage triggers storefront revalidation after publishing", async () => {
  const schema = createInitialPageSchema({
    slug: "contact",
    title: "Contact",
  });
  const calls = {
    pageUpdate: null,
    revalidation: null,
  };
  const prisma = {
    $transaction: async (fn) =>
      fn({
        auditLog: {
          create: async () => ({}),
        },
        page: {
          findFirst: async () => ({
            id: "page-1",
            siteId: "site-1",
            slug: "contact",
            versions: [{ id: "version-1", status: "published", version: 2 }],
          }),
          update: async (input) => {
            calls.pageUpdate = input.data;
            return {};
          },
        },
        pageVersion: {
          create: async (input) => createPageVersionResult(input),
        },
      }),
    site: {
      findFirst: async () => ({
        id: "site-1",
        tenantId: "tenant-1",
      }),
    },
  };

  const result = await publishPage(
    prisma,
    "page-1",
    schema,
    undefined,
    createPageActor(),
    async (input) => {
      calls.revalidation = input;
      return {
        paths: ["/en/contact"],
        tags: ["published-page"],
        triggered: true,
      };
    },
  );

  assert.equal(calls.pageUpdate.publishedVersionId, "version-2");
  assert.deepEqual(calls.revalidation, {
    locale: "en-US",
    market: "us",
    slug: "contact",
  });
  assert.equal(result.meta.revalidation.triggered, true);
});

test("rollbackPage rejects draft target versions", async () => {
  const schema = createInitialPageSchema({
    slug: "home",
    title: "Draft Home",
  });
  const prisma = createRollbackPrisma({
    target: {
      id: "version-draft",
      pageId: "page-1",
      schema,
      status: "draft",
    },
  });

  await assert.rejects(
    () =>
      rollbackPage(
        prisma,
        "page-1",
        { versionId: "version-draft" },
        undefined,
        createPageActor(),
      ),
    (error) => {
      assert.equal(error.getStatus(), 400);
      assert.equal(
        error.getResponse().message,
        "Only published versions can be rolled back.",
      );
      return true;
    },
  );
});

function createRollbackPrisma(options) {
  const target = options.target;

  return {
    $transaction: async (fn) =>
      fn({
        auditLog: {
          create: async (input) => {
            options.onAudit?.(input);
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
          update: async (input) => {
            options.onUpdatePage?.(input);
            return {};
          },
        },
        pageVersion: {
          create: async (input) => options.onCreateVersion(input),
          findFirst: async () => target,
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
