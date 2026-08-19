import assert from "node:assert/strict";
import { test } from "node:test";
import {
  PageRenderer,
  ResponsivePageRenderer,
  createResponsiveRendererCss,
} from "../dist/index.js";
import { exampleLandingPage } from "../../schema/dist/index.js";

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
