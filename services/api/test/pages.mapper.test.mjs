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
import { toPageVersionSummary } from "../dist/modules/pages/pages.versions.js";

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
  assert.equal(resolvePageType("not-found", "system"), "system");
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
  const hero = schema.sections.find(
    (section) => section.component === "hero-banner",
  );
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

test("parsePageSchema normalizes desktop and mobile section order", () => {
  const schema = parsePageSchema(
    {
      data: {
        version: "1.0",
        meta: { slug: "other", title: "Home" },
        layout: {
          desktop: { sectionOrder: ["copy", "missing", "hero", "copy"] },
          mobile: { sectionOrder: ["missing", "hero"] },
        },
        sections: [
          {
            id: "hero",
            component: "hero-banner",
            props: {},
            layout: {
              desktop: { x: 0, y: 0, width: 1200 },
              mobile: { x: 0, y: 0, width: 390 },
            },
          },
          {
            id: "copy",
            component: "rich-text",
            props: {},
            layout: {
              desktop: { x: 0, y: 600, width: 1200 },
              mobile: { x: 0, y: 600, width: 390 },
            },
          },
        ],
        seo: { title: "Home" },
      },
    },
    "home",
  );

  assert.deepEqual(schema.layout.desktop.sectionOrder, ["copy", "hero"]);
  assert.deepEqual(schema.layout.mobile.sectionOrder, ["hero", "copy"]);
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
  const schema = createInitialPageSchema({
    slug: "home",
    title: "Home",
  });
  schema.meta.locale = "de-DE";
  const summary = toPageSummary(
    {
      id: "page-1",
      siteId: "site-1",
      slug: "home",
      title: "Home",
      type: "landing",
      status: "published",
      publishedVersionId: "version-1",
      createdAt,
      updatedAt: createdAt,
    },
    {
      domain: "store.brand-platform.com",
    },
    schema,
  );

  assert.equal(summary.createdAt, "2026-08-18T00:00:00.000Z");
  assert.equal(summary.locale, "de-DE");
  assert.equal(summary.publishedVersionId, "version-1");
  assert.equal(summary.siteDomain, "store.brand-platform.com");
});

test("toPageSummary reads published locale before latest draft locale", () => {
  const createdAt = new Date("2026-08-18T00:00:00.000Z");
  const publishedSchema = createInitialPageSchema({
    slug: "home",
    title: "Home",
  });
  const draftSchema = createInitialPageSchema({
    slug: "home",
    title: "Home Draft",
  });
  publishedSchema.meta.locale = "de-DE";
  draftSchema.meta.locale = "fr-FR";

  const summary = toPageSummary(
    {
      id: "page-1",
      siteId: "site-1",
      slug: "home",
      title: "Home",
      type: "landing",
      status: "published",
      publishedVersionId: "version-published",
      createdAt,
      updatedAt: createdAt,
      versions: [
        { id: "version-draft", schema: draftSchema },
        { id: "version-published", schema: publishedSchema },
      ],
    },
    {
      domain: "store.brand-platform.com",
    },
  );

  assert.equal(summary.locale, "de-DE");
});

test("toPageSummary falls back from missing version locale", () => {
  const createdAt = new Date("2026-08-18T00:00:00.000Z");
  const summary = toPageSummary(
    {
      id: "page-1",
      siteId: "site-1",
      slug: "home",
      title: "Home",
      type: "landing",
      status: "draft",
      publishedVersionId: null,
      createdAt,
      updatedAt: createdAt,
      versions: [{ id: "version-draft", schema: { meta: {} } }],
    },
    {
      domain: "store.brand-platform.com",
    },
  );

  assert.equal(summary.locale, "en-US");
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
