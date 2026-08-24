import assert from "node:assert/strict";
import { test } from "node:test";
import {
  PageRenderer,
  ResponsivePageRenderer,
  createResponsiveRendererCss,
  defaultComponentRegistry,
} from "../dist/index.js";
import {
  exampleLandingPage,
  pageSchema,
} from "../../schema/dist/index.js";

const mvpComponents = [
  "hero-banner",
  "rich-text",
  "image-gallery",
  "cta-bar",
  "faq",
  "spec-table",
];

test("responsive page renderer exposes desktop and mobile render trees", () => {
  const rendered = ResponsivePageRenderer({ schema: exampleLandingPage });
  const [styleNode, desktopNode, mobileNode] = rendered.props.children;

  assert.equal(styleNode.type, "style");
  assert.match(styleNode.props.children, /max-width: 767px/);
  assert.equal(desktopNode.props["data-renderer-viewport"], "desktop");
  assert.equal(mobileNode.props["data-renderer-viewport"], "mobile");
});

test("responsive renderer css accepts a custom mobile breakpoint", () => {
  assert.match(createResponsiveRendererCss(640), /max-width: 639px/);
});

test("default renderer registry covers every MVP section component", () => {
  assert.deepEqual(Object.keys(defaultComponentRegistry).sort(), [
    "cta-bar",
    "faq",
    "hero-banner",
    "image-gallery",
    "rich-text",
    "spec-table",
  ]);
});

test("page renderer renders every MVP section on desktop and mobile", () => {
  const schema = createMvpSectionSchema();

  for (const viewport of ["desktop", "mobile"]) {
    const rendered = PageRenderer({ schema, viewport });
    const components = readRenderedComponents(rendered);
    const missing = readMissingComponents(rendered);

    assert.deepEqual(components, mvpComponents);
    assert.deepEqual(missing, []);
  }
});

test("page renderer resolves translation messages for chrome and sections", () => {
  const schema = structuredClone(exampleLandingPage);
  schema.chrome.header.enabled = true;
  schema.chrome.header.content.brand.label = {
    defaultValue: "Default brand",
    i18nKey: "chrome.brand",
  };
  schema.sections[0].props.title = {
    defaultValue: "Default hero title",
    i18nKey: "sections.hero.title",
  };
  schema.sections[0].props.body = {
    defaultValue: "Default hero body",
    i18nKey: "sections.hero.body",
  };

  const rendered = PageRenderer({
    schema,
    translationMessages: {
      "chrome.brand": "Translated brand",
      "sections.hero.title": "Translated hero title",
    },
    viewport: "desktop",
  });
  const [headerNode] = rendered.props.children;
  const firstSectionNode = readMainChildren(rendered)[0];
  const heroNode = firstSectionNode.props.children.props.children;

  assert.equal(headerNode.props.content.brand.label, "Translated brand");
  assert.equal(heroNode.props.title, "Translated hero title");
  assert.equal(heroNode.props.body, "Default hero body");
});

test("page renderer preserves non-text props with default values", () => {
  const schema = structuredClone(exampleLandingPage);
  schema.sections[0] = {
    ...schema.sections[0],
    component: "custom-card",
    props: {
      config: {
        defaultValue: "raw default",
        mode: "manual",
      },
      title: {
        defaultValue: "Default custom title",
        i18nKey: "sections.custom.title",
      },
    },
  };

  const rendered = PageRenderer({
    registry: {
      "custom-card": () => null,
    },
    schema,
    translationMessages: {
      "sections.custom.title": "Translated custom title",
    },
    viewport: "desktop",
  });
  const firstSectionNode = readMainChildren(rendered)[0];
  const customNode = firstSectionNode.props.children.props.children;

  assert.deepEqual(customNode.props.config, {
    defaultValue: "raw default",
    mode: "manual",
  });
  assert.equal(customNode.props.title, "Translated custom title");
});

test("page renderer applies explicit horizontal layout offsets", () => {
  const schema = structuredClone(exampleLandingPage);
  schema.sections[0].layout.desktop.x = 0;
  schema.sections[1].layout.desktop.x = 24;

  const rendered = PageRenderer({ schema, viewport: "desktop" });
  const mainNode = rendered.props.children[1];
  const [firstSectionNode, secondSectionNode] = mainNode.props.children;
  const firstLayoutNode = firstSectionNode.props.children;
  const secondLayoutNode = secondSectionNode.props.children;

  assert.equal(firstLayoutNode.props.style.marginLeft, 0);
  assert.equal(secondLayoutNode.props.style.marginLeft, 24);
});

test("page renderer derives vertical gaps from y coordinates", () => {
  const schema = structuredClone(exampleLandingPage);
  schema.sections[0].layout.desktop = {
    ...schema.sections[0].layout.desktop,
    height: 100,
    y: 0,
  };
  schema.sections[1].layout.desktop = {
    ...schema.sections[1].layout.desktop,
    height: 80,
    y: 140,
  };

  const rendered = PageRenderer({ schema, viewport: "desktop" });
  const mainNode = rendered.props.children[1];
  const [firstSectionNode, secondSectionNode] = mainNode.props.children;
  const firstLayoutNode = firstSectionNode.props.children;
  const secondLayoutNode = secondSectionNode.props.children;

  assert.equal(firstLayoutNode.props.style.marginTop, undefined);
  assert.equal(secondLayoutNode.props.style.marginTop, 40);
});

test("page renderer keeps layout around missing components", () => {
  const schema = structuredClone(exampleLandingPage);
  schema.sections[0] = {
    ...schema.sections[0],
    component: "unknown-section",
    layout: {
      ...schema.sections[0].layout,
      desktop: {
        ...schema.sections[0].layout.desktop,
        height: 220,
        width: 640,
        x: 32,
      },
    },
  };

  const rendered = PageRenderer({ schema, viewport: "desktop" });
  const mainNode = rendered.props.children[1];
  const firstSectionNode = mainNode.props.children[0];
  const layoutNode = firstSectionNode.props.children;
  const missingNode = layoutNode.props.children;

  assert.equal(layoutNode.props["data-component"], "unknown-section");
  assert.equal(layoutNode.props.style.marginLeft, 32);
  assert.equal(layoutNode.props.style.minHeight, 220);
  assert.equal(layoutNode.props.style.width, 640);
  assert.equal(
    missingNode.props["data-component-missing"],
    "unknown-section",
  );
});

function createMvpSectionSchema() {
  return pageSchema.parse({
    ...exampleLandingPage,
    sections: mvpComponents.map((component, index) =>
      createSection(component, index),
    ),
  });
}

function createSection(component, index) {
  const y = index * 180;

  return {
    id: `${component}-section`,
    component,
    layout: {
      desktop: { height: 160, width: 1200, x: 0, y },
      mobile: { height: 160, width: 390, x: 0, y },
    },
    props: readSectionProps(component),
    visibility: { desktop: true, mobile: true },
  };
}

function readSectionProps(component) {
  if (component === "hero-banner") {
    return {
      body: { defaultValue: "Hero body" },
      ctaHref: "/en/contact",
      ctaLabel: "Contact",
      eyebrow: "MVP",
      title: { defaultValue: "Hero title" },
    };
  }

  if (component === "rich-text") {
    return {
      content: { defaultValue: "<p>Editorial copy</p>" },
      title: { defaultValue: "Rich text" },
    };
  }

  if (component === "image-gallery") {
    return {
      images: [
        {
          alt: "Product",
          src: "https://cdn.example.com/product.jpg",
        },
      ],
    };
  }

  if (component === "cta-bar") {
    return {
      ctaHref: "/en/contact",
      ctaLabel: "Start",
      title: { defaultValue: "Call to action" },
    };
  }

  if (component === "faq") {
    return {
      items: [{ answer: "Answer", question: "Question" }],
    };
  }

  return {
    rows: [{ label: "Material", value: "Aluminum" }],
  };
}

function readRenderedComponents(rendered) {
  return readMainChildren(rendered).map(
    (sectionNode) => sectionNode.props.children.props["data-component"],
  );
}

function readMissingComponents(rendered) {
  return readMainChildren(rendered)
    .map((sectionNode) => sectionNode.props.children.props.children)
    .filter((node) => node?.props?.["data-component-missing"])
    .map((node) => node.props["data-component-missing"]);
}

function readMainChildren(rendered) {
  const children = Array.isArray(rendered.props.children)
    ? rendered.props.children
    : [rendered.props.children];
  const mainNode = children.find((child) => child?.type === "main");

  return Array.isArray(mainNode.props.children)
    ? mainNode.props.children
    : [mainNode.props.children];
}
