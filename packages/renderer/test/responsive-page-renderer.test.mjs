import assert from "node:assert/strict";
import { test } from "node:test";
import {
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
