import assert from "node:assert/strict";
import test from "node:test";
import {
  CtaBar,
  Faq,
  HeroBanner,
  ImageGallery,
  RichText,
  SpecTable,
  StorefrontFooter,
  StorefrontHeader,
  storefrontShellClassName,
} from "../dist/index.js";

test("storefront chrome and sections share one content shell", () => {
  assert.equal(storefrontShellClassName, "mx-auto max-w-6xl px-6 md:px-10");

  const classNames = [
    StorefrontHeader({}).props.children.props.className,
    StorefrontFooter({}).props.children.props.className,
    HeroBanner({}).props.className,
    RichText({}).props.className,
    Faq({}).props.className,
    SpecTable({}).props.className,
    ImageGallery({}).props.className,
    CtaBar({}).props.children.props.className,
  ];

  for (const className of classNames) {
    assert.match(className, /(?:^|\s)max-w-6xl(?:\s|$)/);
    assert.match(className, /(?:^|\s)px-6(?:\s|$)/);
    assert.match(className, /(?:^|\s)md:px-10(?:\s|$)/);
    assert.equal(className.includes("max-w-4xl"), false);
  }
});
