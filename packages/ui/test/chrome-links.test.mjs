import assert from "node:assert/strict";
import test from "node:test";
import { StorefrontFooter, StorefrontHeader } from "../dist/index.js";

test("storefront header renders the default kinolin brand logo", () => {
  const header = StorefrontHeader({
    content: {
      brand: {
        href: "/",
        label: "kinolin",
        logoSrc: "/brand/kinolin-logo.svg",
      },
    },
  });
  const logo = findElements(header, "img")[0];

  assert.equal(logo?.props.src, "/brand/kinolin-logo.svg");
  assert.equal(logo?.props.alt, "kinolin");
});

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
      (node) => node.props["data-chrome-brand-href-blocked"] === "unsafe",
    ),
    true,
  );
  assert.equal(
    blocked.some(
      (node) => node.props["data-chrome-navigation-href-blocked"] === "unsafe",
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
      (node) => node.props["data-chrome-brand-href-blocked"] === "unsafe",
    ),
    true,
  );
  assert.equal(
    blocked.some(
      (node) => node.props["data-chrome-navigation-href-blocked"] === "unsafe",
    ),
    true,
  );
});

test("storefront chrome links do not expose blocked href values", () => {
  const header = StorefrontHeader({
    content: {
      navigation: [
        {
          href: "https://user:password@example.com/private?token=secret",
          label: "Private",
        },
      ],
    },
  });
  const blocked = findElements(header, "span");
  const links = findElements(header, "a");

  assert.equal(links.length, 1);
  assert.equal(
    blocked.some(
      (node) => node.props["data-chrome-navigation-href-blocked"] === "unsafe",
    ),
    true,
  );
  assert.equal(
    links.some((node) => String(node.props.href).includes("password")),
    false,
  );
  assert.equal(
    blocked.some((node) => JSON.stringify(node.props).includes("password")),
    false,
  );
  assert.equal(
    blocked.some((node) => JSON.stringify(node.props).includes("token=secret")),
    false,
  );
});

test("storefront chrome links block sensitive href parameters", () => {
  const header = StorefrontHeader({
    content: {
      navigation: [
        {
          href: "https://example.com/private?token=secret-value",
          label: "Private",
        },
        {
          href: "https://example.com/callback#access_token=fragment-token",
          label: "Callback",
        },
        {
          href: "https://example.com/callback?oauth_verifier=oauth-verifier",
          label: "Verifier",
        },
      ],
    },
  });
  const blocked = findElements(header, "span");
  const rendered = JSON.stringify({
    blocked: blocked.map((node) => node.props),
    links: findElements(header, "a").map((node) => node.props),
  });

  assert.equal(findElements(header, "a").length, 1);
  assert.equal(
    blocked.filter(
      (node) => node.props["data-chrome-navigation-href-blocked"] === "unsafe",
    ).length,
    3,
  );
  assert.equal(rendered.includes("secret-value"), false);
  assert.equal(rendered.includes("fragment-token"), false);
  assert.equal(rendered.includes("oauth-verifier"), false);
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
