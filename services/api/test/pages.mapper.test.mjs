import assert from "node:assert/strict";
import test from "node:test";
import {
  createInitialPageSchema,
  nextVersionNumber,
  pageSlugSchema,
  parsePageSchema,
  resolvePageType,
  toPageSummary,
  unwrapBodyData,
} from "../dist/modules/pages/pages.mapper.js";
import { rollbackPage } from "../dist/modules/pages/use-cases/rollback-page.js";
import {
  persistRollbackVersion,
  toPageVersionSummary,
} from "../dist/modules/pages/pages.versions.js";

test("unwrapBodyData reads wrapped or raw objects", () => {
  assert.deepEqual(unwrapBodyData({ data: { slug: "home" } }), {
    slug: "home",
  });
  assert.deepEqual(unwrapBodyData({ slug: "home" }), { slug: "home" });
  assert.throws(() => unwrapBodyData(null), /Request body must be an object/);
});

test("pageSlugSchema accepts nested lowercase slugs", () => {
  assert.equal(pageSlugSchema.parse("home"), "home");
  assert.equal(pageSlugSchema.parse("privacy-policy"), "privacy-policy");
  assert.equal(pageSlugSchema.parse("legal/terms"), "legal/terms");
  assert.throws(() => pageSlugSchema.parse("Home"));
  assert.throws(() => pageSlugSchema.parse("/leading-slash"));
});

test("resolvePageType maps templates and system slugs", () => {
  assert.equal(resolvePageType("home"), "landing");
  assert.equal(resolvePageType("privacy", "policy"), "policy");
  assert.equal(resolvePageType("privacy-policy"), "policy");
  assert.equal(resolvePageType("404"), "system");
});

test("createInitialPageSchema applies the selected template", () => {
  const schema = createInitialPageSchema({
    slug: "campaign",
    title: "Campaign",
    templateId: "landing-blank",
  });

  assert.equal(schema.meta.slug, "campaign");
  assert.equal(schema.meta.title, "Campaign");
  assert.equal(schema.template.id, "landing-blank");
  const hero = schema.sections.find((section) => section.component === "hero-banner");
  assert.equal(
    hero &&
      typeof hero.props.title === "object" &&
      hero.props.title &&
      "defaultValue" in hero.props.title
      ? hero.props.title.defaultValue
      : null,
    "Campaign",
  );
});

test("parsePageSchema forces the stored slug", () => {
  const schema = parsePageSchema(
    {
      data: {
        version: "1.0",
        meta: { slug: "other", title: "Home" },
        layout: { desktop: {}, mobile: {} },
        sections: [],
        seo: { title: "Home" },
      },
    },
    "home",
  );

  assert.equal(schema.meta.slug, "home");
});

test("parsePageSchema rejects invalid stored slugs", () => {
  assert.throws(() =>
    parsePageSchema(
      {
        data: {
          version: "1.0",
          meta: { title: "Home" },
          layout: { desktop: {}, mobile: {} },
          sections: [],
          seo: { title: "Home" },
        },
      },
      "Home",
    ),
  );
});

test("nextVersionNumber increments from the latest version", () => {
  assert.equal(nextVersionNumber(undefined), 1);
  assert.equal(nextVersionNumber(3), 4);
});

test("toPageSummary serializes timestamps", () => {
  const createdAt = new Date("2026-08-18T00:00:00.000Z");
  const summary = toPageSummary({
    id: "page-1",
    siteId: "site-1",
    slug: "home",
    title: "Home",
    type: "landing",
    status: "published",
    publishedVersionId: "version-1",
    createdAt,
    updatedAt: createdAt,
  });

  assert.equal(summary.createdAt, "2026-08-18T00:00:00.000Z");
  assert.equal(summary.publishedVersionId, "version-1");
});

test("toPageVersionSummary includes publish actor details", () => {
  const createdAt = new Date("2026-08-18T00:00:00.000Z");
  const summary = toPageVersionSummary(
    {
      id: "version-1",
      version: 2,
      status: "published",
      authorId: "user-1",
      publishedAt: createdAt,
      createdAt,
    },
    {
      id: "user-1",
      email: "admin@example.com",
      name: "Tenant Admin",
    },
  );

  assert.equal(summary.authorId, "user-1");
  assert.equal(summary.authorEmail, "admin@example.com");
  assert.equal(summary.authorName, "Tenant Admin");
  assert.equal(summary.publishedAt, "2026-08-18T00:00:00.000Z");
});

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

          return {
            id: "version-rollback",
            createdAt: new Date("2026-08-18T00:00:00.000Z"),
            publishedAt: input.data.publishedAt,
            status: input.data.status,
            version: input.data.version,
          };
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
  };
  const prisma = createRollbackPrisma({
    onCreateVersion: (input) => {
      calls.createdVersion = input.data;
      return {
        id: "version-rollback",
        createdAt: new Date("2026-08-18T00:00:00.000Z"),
        publishedAt: input.data.publishedAt,
        status: input.data.status,
        version: input.data.version,
      };
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
    createActor(),
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
        createActor(),
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

function createActor() {
  return {
    email: "admin@example.com",
    id: "user-1",
    scopes: ["page:publish"],
    tenantId: "tenant-1",
  };
}

function createRollbackPrisma(options) {
  const target = options.target;

  return {
    $transaction: async (fn) =>
      fn({
        page: {
          findFirst: async () => ({
            id: "page-1",
            siteId: "site-1",
            slug: "home",
            versions: [{ id: "version-latest", status: "published", version: 3 }],
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
