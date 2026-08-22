import assert from "node:assert/strict";
import test from "node:test";
import { StorefrontFooter, StorefrontHeader } from "../dist/index.js";

test("storefront header blocks unsafe chrome hrefs", () => {
  const header = StorefrontHeader({
    content: {
      brand: {
        href: "javascript:alert(1)",
        label: "Brand",
      },
      navigation: [
        {
          href: "javascript:alert(2)",
          label: "Bad",
        },
      ],
    },
  });
  const blocked = findElements(header, "span");

  assert.equal(findElements(header, "a").length, 0);
  assert.equal(
    blocked.some(
      (node) =>
        node.props["data-chrome-brand-href-blocked"] === "javascript:alert(1)",
    ),
    true,
  );
  assert.equal(
    blocked.some(
      (node) =>
        node.props["data-chrome-navigation-href-blocked"] ===
        "javascript:alert(2)",
    ),
    true,
  );
});

test("storefront header keeps safe new-tab chrome links protected", () => {
  const header = StorefrontHeader({
    content: {
      navigation: [
        {
          href: "https://example.com",
          label: "External",
          openInNewTab: true,
        },
      ],
    },
  });
  const externalLink = findElements(header, "a").find(
    (node) => node.props.href === "https://example.com",
  );

  assert.equal(externalLink?.props.target, "_blank");
  assert.equal(externalLink?.props.rel, "noopener noreferrer");
});

test("storefront footer blocks unsafe chrome hrefs", () => {
  const footer = StorefrontFooter({
    content: {
      brand: {
        href: "javascript:alert(1)",
        label: "Brand",
      },
      navigation: [
        {
          href: "javascript:alert(2)",
          label: "Bad footer",
        },
      ],
    },
  });
  const blocked = findElements(footer, "span");

  assert.equal(findElements(footer, "a").length, 0);
  assert.equal(
    blocked.some(
      (node) =>
        node.props["data-chrome-brand-href-blocked"] === "javascript:alert(1)",
    ),
    true,
  );
  assert.equal(
    blocked.some(
      (node) =>
        node.props["data-chrome-navigation-href-blocked"] ===
        "javascript:alert(2)",
    ),
    true,
  );
});

function findElements(node, type) {
  if (!node || typeof node !== "object") {
    return [];
  }

  if (typeof node.type === "function") {
    return findElements(node.type(node.props), type);
  }

  const matches = node.type === type ? [node] : [];
  const children = node.props?.children;
  const childNodes = Array.isArray(children) ? children : [children];

  return matches.concat(
    childNodes.flatMap((child) => findElements(child, type)),
  );
}
