import assert from "node:assert/strict";
import test from "node:test";
import { CtaBar, HeroBanner } from "../dist/index.js";

test("hero banner renders safe CTA links", () => {
  const hero = HeroBanner({
    ctaHref: "/en/contact",
    ctaLabel: "Contact us",
    title: "Hero",
  });
  const link = findFirstElement(hero, "a");

  assert.equal(link?.props.href, "/en/contact");
  assert.equal(link?.props.children, "Contact us");
});

test("CTA bar renders safe external CTA links", () => {
  const cta = CtaBar({
    ctaHref: "https://example.com/signup",
    ctaLabel: "Start now",
    title: "Ready",
  });
  const link = findFirstElement(cta, "a");

  assert.equal(link?.props.href, "https://example.com/signup");
});

test("CTA components block unsafe href protocols", () => {
  const hero = HeroBanner({
    ctaHref: "javascript:alert(1)",
    ctaLabel: "Launch",
    title: "Hero",
  });
  const blocked = findFirstElement(hero, "span");

  assert.equal(findFirstElement(hero, "a"), null);
  assert.equal(blocked?.props["data-cta-href-blocked"], "unsafe");
});

test("CTA components block hrefs with control characters", () => {
  const cta = CtaBar({
    ctaHref: "https://example.com\njavascript:alert(1)",
    ctaLabel: "Launch",
    title: "Ready",
  });
  const blocked = findFirstElement(cta, "span");

  assert.equal(findFirstElement(cta, "a"), null);
  assert.equal(blocked?.props["data-cta-href-blocked"], "unsafe");
});

test("CTA components do not expose blocked href values", () => {
  const cta = CtaBar({
    ctaHref: "https://user:password@example.com/signup?token=secret",
    ctaLabel: "Launch",
    title: "Ready",
  });
  const rendered = JSON.stringify(cta);
  const blocked = findFirstElement(cta, "span");

  assert.equal(findFirstElement(cta, "a"), null);
  assert.equal(blocked?.props["data-cta-href-blocked"], "unsafe");
  assert.equal(rendered.includes("password"), false);
  assert.equal(rendered.includes("token=secret"), false);
});

test("CTA components block sensitive href parameters", () => {
  for (const { ctaHref, leakedValue } of [
    {
      ctaHref: "https://example.com/signup?api_key=secret-value",
      leakedValue: "secret-value",
    },
    {
      ctaHref: "https://example.com/callback?authorization_code=oauth-code",
      leakedValue: "oauth-code",
    },
    {
      ctaHref: "https://example.com/callback#access_token=fragment-token",
      leakedValue: "fragment-token",
    },
  ]) {
    const cta = CtaBar({
      ctaHref,
      ctaLabel: "Launch",
      title: "Ready",
    });
    const rendered = JSON.stringify(cta);
    const blocked = findFirstElement(cta, "span");

    assert.equal(findFirstElement(cta, "a"), null);
    assert.equal(blocked?.props["data-cta-href-blocked"], "unsafe");
    assert.equal(rendered.includes(leakedValue), false);
  }
});

function findFirstElement(node, type) {
  if (!node || typeof node !== "object") {
    return null;
  }

  if (node.type === type) {
    return node;
  }

  const children = node.props?.children;
  const childNodes = Array.isArray(children) ? children : [children];

  for (const child of childNodes) {
    const found = findFirstElement(child, type);

    if (found) {
      return found;
    }
  }

  return null;
}
