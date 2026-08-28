import assert from "node:assert/strict";
import test from "node:test";
import {
  createDefaultSeedPageDefinitions,
  seedDefaultPages,
} from "../prisma/seed-pages.mjs";

test("default seed pages cover the MVP page scope", () => {
  const pages = createDefaultSeedPageDefinitions();
  const pagesBySlug = Object.fromEntries(pages.map((page) => [page.slug, page]));

  assert.deepEqual(
    pages.map((page) => page.slug),
    ["home", "privacy", "terms", "404"],
  );
  assert.equal(pagesBySlug.home.type, "landing");
  assert.equal(pagesBySlug.privacy.type, "policy");
  assert.equal(pagesBySlug.terms.type, "policy");
  assert.equal(pagesBySlug["404"].type, "system");
});

test("default seed page schemas use the expected templates", () => {
  const pages = createDefaultSeedPageDefinitions();
  const pagesBySlug = Object.fromEntries(pages.map((page) => [page.slug, page]));

  assert.equal(pagesBySlug.home.schema.template.id, "landing-blank");
  assert.equal(pagesBySlug.home.title, "Home");

  assert.equal(pagesBySlug.privacy.title, "Privacy Policy");
  assert.equal(pagesBySlug.privacy.schema.template.id, "policy");
  assert.equal(pagesBySlug.privacy.schema.chrome.header.enabled, true);
  assert.equal(pagesBySlug.privacy.schema.chrome.footer.enabled, true);
  assert.equal(pagesBySlug.privacy.schema.sections[0]?.component, "rich-text");

  assert.equal(pagesBySlug.terms.title, "Terms of Service");
  assert.equal(pagesBySlug.terms.schema.template.id, "policy");

  assert.equal(pagesBySlug["404"].title, "Page not found");
  assert.equal(pagesBySlug["404"].schema.template.id, "system");
  assert.equal(pagesBySlug["404"].schema.seo.noIndex, true);
  assert.equal(pagesBySlug["404"].schema.sections[0]?.id, "system-hero");
});

test("seed default pages keep published pages and create missing ones", async () => {
  const { prisma, calls, pagesBySlug } = createFakePrisma({
    home: {
      id: "page-home",
      slug: "home",
      title: "Home",
      type: "landing",
      status: "published",
      publishedVersionId: "version-home",
      versions: [{ id: "version-home", status: "published" }],
    },
  });

  const pageIds = await seedDefaultPages(prisma, {
    authorId: "admin-1",
    siteId: "site-1",
  });

  assert.deepEqual(pageIds, {
    home: "page-home",
    privacy: "page-privacy",
    terms: "page-terms",
    404: "page-404",
  });
  assert.equal(pagesBySlug.get("home").title, "Home");
  assert.equal(
    calls.some((call) => call.kind === "page.update" && call.slug === "home"),
    false,
  );
  assert.deepEqual(
    calls
      .filter((call) => call.kind === "page.create")
      .map((call) => call.slug),
    ["privacy", "terms", "404"],
  );
});

function createFakePrisma(seedPages = {}) {
  const calls = [];
  const pagesBySlug = new Map(
    Object.entries(seedPages).map(([slug, page]) => [slug, { ...page }]),
  );

  const findPageById = (id) => {
    for (const page of pagesBySlug.values()) {
      if (page.id === id) {
        return page;
      }
    }
    throw new Error(`Unknown fake page id: ${id}`);
  };

  return {
    calls,
    pagesBySlug,
    prisma: {
      page: {
        async findUnique(query) {
          return pagesBySlug.get(query.where.siteId_slug.slug) ?? null;
        },
        async create(query) {
          const { data } = query;
          const page = {
            id: `page-${data.slug}`,
            ...data,
            publishedVersionId: null,
            versions: [],
          };
          calls.push({ kind: "page.create", slug: data.slug });
          pagesBySlug.set(data.slug, page);
          return page;
        },
        async update(query) {
          const page = findPageById(query.where.id);
          Object.assign(page, query.data);
          calls.push({ kind: "page.update", slug: page.slug });
          return page;
        },
      },
      pageVersion: {
        async create(query) {
          const page = findPageById(query.data.pageId);
          const version = {
            id: `version-${page.slug}`,
            ...query.data,
          };
          page.versions = [version, ...page.versions];
          calls.push({ kind: "pageVersion.create", slug: page.slug });
          return version;
        },
        async update(query) {
          calls.push({ kind: "pageVersion.update", id: query.where.id });
          return { id: query.where.id, ...query.data };
        },
      },
    },
  };
}
