import assert from "node:assert/strict";
import test from "node:test";
import {
  collectMediaReferences,
  getOrderedSectionsForViewport,
} from "@app-starter/schema";
import { GET as getVisualFixtureAsset } from "../src/app/visual-acceptance/assets/[asset]/route.ts";
import {
  pageBuilderVisualFixtureAssetNames,
  readPageBuilderVisualFixtureAsset,
} from "../src/lib/page-builder-visual-fixture-assets.ts";
import {
  createPageBuilderVisualFixtureSchema,
  isPageBuilderVisualFixtureEnabled,
  pageBuilderVisualFixtureComponents,
  pageBuilderVisualFixtureFlag,
  pageBuilderVisualFixturePath,
  readPageBuilderVisualFixtureComponent,
  readPageBuilderVisualFixtureViewport,
  resolvePageBuilderVisualFixtureMediaUrl,
} from "../src/lib/page-builder-visual-fixture.ts";

test("visual acceptance fixture schema covers the six core sections", () => {
  const schema = createPageBuilderVisualFixtureSchema();
  const components = schema.sections.map((section) => section.component);

  assert.deepEqual(components, [
    "hero-banner",
    "rich-text",
    "image-gallery",
    "cta-bar",
    "faq",
    "spec-table",
  ]);
  assert.deepEqual(
    getOrderedSectionsForViewport(schema, "desktop").map(
      (section) => section.id,
    ),
    schema.layout.desktop.sectionOrder,
  );
  assert.deepEqual(
    getOrderedSectionsForViewport(schema, "mobile").map(
      (section) => section.id,
    ),
    schema.layout.mobile.sectionOrder,
  );
});

test("visual acceptance fixture can isolate each core section", () => {
  assert.deepEqual(pageBuilderVisualFixtureComponents, [
    "hero-banner",
    "rich-text",
    "image-gallery",
    "cta-bar",
    "faq",
    "spec-table",
  ]);

  for (const component of pageBuilderVisualFixtureComponents) {
    const schema = createPageBuilderVisualFixtureSchema({ component });
    const section = schema.sections[0];

    assert.equal(schema.sections.length, 1);
    assert.equal(section?.component, component);
    assert.equal(section?.layout.desktop?.y, 0);
    assert.equal(section?.layout.mobile?.y, 0);
    assert.deepEqual(schema.layout.desktop.sectionOrder, [section?.id]);
    assert.deepEqual(schema.layout.mobile.sectionOrder, [section?.id]);
  }
});

test("visual acceptance fixture resolves media references to local assets", () => {
  const references = collectMediaReferences(
    createPageBuilderVisualFixtureSchema(),
  );

  assert.deepEqual(references, [
    "media://visual-gallery-a",
    "media://visual-gallery-b",
    "media://visual-gallery-c",
  ]);
  assert.deepEqual(references.map(resolvePageBuilderVisualFixtureMediaUrl), [
    `${pageBuilderVisualFixturePath}/assets/visual-gallery-a.svg`,
    `${pageBuilderVisualFixturePath}/assets/visual-gallery-b.svg`,
    `${pageBuilderVisualFixturePath}/assets/visual-gallery-c.svg`,
  ]);
});

test("visual acceptance fixture gate requires explicit true", () => {
  assert.equal(isPageBuilderVisualFixtureEnabled({}), false);
  assert.equal(
    isPageBuilderVisualFixtureEnabled({
      [pageBuilderVisualFixtureFlag]: "TRUE",
    }),
    false,
  );
  assert.equal(
    isPageBuilderVisualFixtureEnabled({
      [pageBuilderVisualFixtureFlag]: "true",
    }),
    true,
  );
});

test("visual acceptance fixture viewport defaults to desktop", () => {
  assert.equal(readPageBuilderVisualFixtureViewport("mobile"), "mobile");
  assert.equal(readPageBuilderVisualFixtureViewport("desktop"), "desktop");
  assert.equal(readPageBuilderVisualFixtureViewport("tablet"), "desktop");
  assert.equal(readPageBuilderVisualFixtureViewport(["mobile"]), "desktop");
  assert.equal(readPageBuilderVisualFixtureViewport(undefined), "desktop");
});

test("visual acceptance fixture component query is explicit and whitelisted", () => {
  assert.equal(
    readPageBuilderVisualFixtureComponent("image-gallery"),
    "image-gallery",
  );
  assert.equal(readPageBuilderVisualFixtureComponent(undefined), undefined);
  assert.equal(readPageBuilderVisualFixtureComponent("product-card"), null);
  assert.equal(readPageBuilderVisualFixtureComponent(["faq"]), null);
});

test("visual acceptance fixture assets are static and whitelisted", () => {
  assert.deepEqual(pageBuilderVisualFixtureAssetNames, [
    "visual-gallery-a.svg",
    "visual-gallery-b.svg",
    "visual-gallery-c.svg",
    "visual-gallery-missing.svg",
  ]);

  const asset = readPageBuilderVisualFixtureAsset("visual-gallery-a.svg");
  assert.equal(asset?.contentType, "image/svg+xml");
  assert.match(asset?.body ?? "", /<svg/);
  assert.doesNotMatch(asset?.body ?? "", /<script/i);
  assert.equal(readPageBuilderVisualFixtureAsset("../secret.svg"), null);
});

test("visual acceptance fixture asset route is disabled by default", async () => {
  await withVisualFixtureFlag(undefined, async () => {
    const response = await getFixtureAssetResponse("visual-gallery-a.svg");

    assert.equal(response.status, 404);
    assert.equal(response.headers.get("x-robots-tag"), "noindex, nofollow");
  });
});

test("visual acceptance fixture asset route serves whitelisted assets", async () => {
  await withVisualFixtureFlag("true", async () => {
    const response = await getFixtureAssetResponse("visual-gallery-a.svg");

    assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-type"), "image/svg+xml");
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.match(await response.text(), /Gallery fixture image A/);

    const unknown = await getFixtureAssetResponse("unknown.svg");
    assert.equal(unknown.status, 404);
  });
});

async function getFixtureAssetResponse(asset) {
  return getVisualFixtureAsset(new Request("http://localhost/fixture"), {
    params: Promise.resolve({ asset }),
  });
}

async function withVisualFixtureFlag(value, fn) {
  const previous = process.env[pageBuilderVisualFixtureFlag];

  if (value === undefined) {
    delete process.env[pageBuilderVisualFixtureFlag];
  } else {
    process.env[pageBuilderVisualFixtureFlag] = value;
  }

  try {
    return await fn();
  } finally {
    if (previous === undefined) {
      delete process.env[pageBuilderVisualFixtureFlag];
    } else {
      process.env[pageBuilderVisualFixtureFlag] = previous;
    }
  }
}
