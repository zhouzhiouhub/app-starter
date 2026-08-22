import assert from "node:assert/strict";
import test from "node:test";
import { exampleLandingPage } from "@app-starter/schema";
import {
  applyPublishPreflightIssueFix,
  readPublishPreflightIssueFixLabel,
} from "../src/features/pages/publish-preflight-issue-fix.ts";

test("publish preflight issue fix labels section order warnings", () => {
  assert.equal(
    readPublishPreflightIssueFixLabel({
      field: "layout.desktop.sectionOrder",
      message: "Desktop section order will be normalized.",
      severity: "warning",
    }),
    "Normalize desktop order",
  );
  assert.equal(
    readPublishPreflightIssueFixLabel({
      field: "sections[0].props.ctaHref",
      message: "CTA link is missing.",
      severity: "warning",
    }),
    "Clear CTA fields",
  );
  assert.equal(
    readPublishPreflightIssueFixLabel({
      field: "sections[2].props.images[1].src",
      message: "Image source is blank.",
      severity: "warning",
    }),
    "Remove blank image",
  );
  assert.equal(
    readPublishPreflightIssueFixLabel({
      field: "seo.canonical",
      message: "Canonical URL is invalid.",
      severity: "error",
    }),
    "Clear SEO URL",
  );
  assert.equal(
    readPublishPreflightIssueFixLabel({
      field: "chrome.header.content.localeSwitcher.locales[0].href",
      message: "Locale switcher link is invalid.",
      severity: "error",
    }),
    "Clear locale link",
  );
  assert.equal(
    readPublishPreflightIssueFixLabel({
      field: "sections[1].props.content",
      message: "Rich text markup will be sanitized.",
      severity: "warning",
    }),
    "Sanitize rich text",
  );
  assert.equal(
    readPublishPreflightIssueFixLabel({
      field: "seo.ogImage",
      message: "Open Graph image needs review.",
      severity: "warning",
    }),
    null,
  );
});

test("publish preflight issue fix normalizes only the matching viewport order", () => {
  const schema = structuredClone(exampleLandingPage);
  schema.layout.desktop.sectionOrder = ["copy", "missing", "copy"];
  schema.layout.mobile.sectionOrder = ["hero", "copy"];

  const fixed = applyPublishPreflightIssueFix(schema, {
    field: "layout.desktop.sectionOrder",
    message: "Desktop section order will be normalized.",
    severity: "warning",
  });

  assert.deepEqual(fixed?.layout.desktop.sectionOrder, ["copy", "hero"]);
  assert.deepEqual(fixed?.layout.mobile.sectionOrder, ["hero", "copy"]);
  assert.deepEqual(schema.layout.desktop.sectionOrder, [
    "copy",
    "missing",
    "copy",
  ]);
});

test("publish preflight issue fix sanitizes rich text content", () => {
  const schema = structuredClone(exampleLandingPage);
  schema.sections[1].props.content = {
    defaultValue:
      '<p onclick="alert(1)">Safe</p><script>alert(2)</script><a href="javascript:alert(3)">Bad</a>',
    i18nKey: "sections.copy.content",
  };

  const fixed = applyPublishPreflightIssueFix(schema, {
    field: "sections[1].props.content",
    message: "Rich text section 2: unsupported markup will be removed.",
    severity: "warning",
  });

  assert.deepEqual(fixed?.sections[1].props.content, {
    defaultValue: "<p>Safe</p>Bad",
    i18nKey: "sections.copy.content",
  });
  assert.deepEqual(schema.sections[1].props.content, {
    defaultValue:
      '<p onclick="alert(1)">Safe</p><script>alert(2)</script><a href="javascript:alert(3)">Bad</a>',
    i18nKey: "sections.copy.content",
  });
});

test("publish preflight issue fix clears incomplete CTA fields", () => {
  const schema = structuredClone(exampleLandingPage);
  schema.sections[0].props.ctaHref = "";
  schema.sections[0].props.ctaLabel = "Start";
  const linkOnlySchema = structuredClone(exampleLandingPage);
  linkOnlySchema.sections[0].props.ctaHref = "/en/contact";
  linkOnlySchema.sections[0].props.ctaLabel = "";

  const fixed = applyPublishPreflightIssueFix(schema, {
    field: "sections[0].props.ctaHref",
    message: "hero-banner CTA link is missing.",
    severity: "warning",
  });
  const fixedLinkOnly = applyPublishPreflightIssueFix(linkOnlySchema, {
    field: "sections[0].props.ctaLabel",
    message: "hero-banner CTA label is missing.",
    severity: "warning",
  });

  assert.equal(fixed?.sections[0].props.ctaHref, "");
  assert.equal(fixed?.sections[0].props.ctaLabel, "");
  assert.equal(fixedLinkOnly?.sections[0].props.ctaHref, "");
  assert.equal(fixedLinkOnly?.sections[0].props.ctaLabel, "");
  assert.equal(schema.sections[0].props.ctaLabel, "Start");
  assert.equal(linkOnlySchema.sections[0].props.ctaHref, "/en/contact");
});

test("publish preflight issue fix ignores complete or blocked CTA fields", () => {
  const complete = applyPublishPreflightIssueFix(exampleLandingPage, {
    field: "sections[0].props.ctaHref",
    message: "CTA link needs review.",
    severity: "warning",
  });
  const blocked = applyPublishPreflightIssueFix(exampleLandingPage, {
    field: "sections[0].props.ctaHref",
    message: "CTA link is unsafe.",
    severity: "error",
  });

  assert.equal(complete, null);
  assert.equal(blocked, null);
});

test("publish preflight issue fix clears optional SEO URL fields", () => {
  const schema = structuredClone(exampleLandingPage);
  schema.seo.canonical = "javascript:alert(1)";
  schema.seo.description = "Search description";
  schema.seo.ogImage = "http://cdn.example.com/og.jpg";
  schema.seo.title = "Search title";

  const fixedCanonical = applyPublishPreflightIssueFix(schema, {
    field: "seo.canonical",
    message: "Canonical URL is invalid.",
    severity: "error",
  });
  const fixedOgImage = applyPublishPreflightIssueFix(schema, {
    field: "seo.ogImage",
    message: "Open Graph image is invalid.",
    severity: "error",
  });

  assert.equal(fixedCanonical?.seo.canonical, undefined);
  assert.equal(fixedCanonical?.seo.ogImage, "http://cdn.example.com/og.jpg");
  assert.equal(fixedCanonical?.seo.title, "Search title");
  assert.equal(fixedCanonical?.seo.description, "Search description");
  assert.equal(fixedOgImage?.seo.canonical, "javascript:alert(1)");
  assert.equal(fixedOgImage?.seo.ogImage, undefined);
  assert.equal(schema.seo.canonical, "javascript:alert(1)");
  assert.equal(schema.seo.ogImage, "http://cdn.example.com/og.jpg");
});

test("publish preflight issue fix ignores nonblocking SEO image references", () => {
  const fixed = applyPublishPreflightIssueFix(exampleLandingPage, {
    field: "seo.ogImage",
    message: "Open Graph image uses a media reference.",
    severity: "warning",
  });

  assert.equal(fixed, null);
});

test("publish preflight issue fix clears optional locale switcher hrefs", () => {
  const schema = structuredClone(exampleLandingPage);
  schema.chrome.header.content.localeSwitcher.locales[0] = {
    code: "en-US",
    href: "javascript:alert(1)",
    label: { defaultValue: "English" },
  };

  const fixed = applyPublishPreflightIssueFix(schema, {
    field: "chrome.header.content.localeSwitcher.locales[0].href",
    message: "Locale switcher link is invalid.",
    severity: "error",
  });

  assert.deepEqual(fixed?.chrome.header.content.localeSwitcher.locales[0], {
    code: "en-US",
    label: { defaultValue: "English" },
  });
  assert.equal(
    schema.chrome.header.content.localeSwitcher.locales[0].href,
    "javascript:alert(1)",
  );
});

test("publish preflight issue fix ignores required chrome links", () => {
  const fixed = applyPublishPreflightIssueFix(exampleLandingPage, {
    field: "chrome.header.content.navigation[0].href",
    message: "Header navigation link is invalid.",
    severity: "error",
  });

  assert.equal(fixed, null);
});

test("publish preflight issue fix removes blank gallery image rows", () => {
  const schema = createGallerySchema();
  schema.sections[2].props.images = [
    { alt: "Product A", src: "/images/a.jpg" },
    { alt: "Blank row", src: "  " },
    { alt: "Product B", src: "/images/b.jpg" },
  ];

  const fixed = applyPublishPreflightIssueFix(schema, {
    field: "sections[2].props.images[1].src",
    message: "Image gallery image 2: Add an image source.",
    severity: "warning",
  });

  assert.deepEqual(fixed?.sections[2].props.images, [
    { alt: "Product A", src: "/images/a.jpg" },
    { alt: "Product B", src: "/images/b.jpg" },
  ]);
  assert.deepEqual(schema.sections[2].props.images, [
    { alt: "Product A", src: "/images/a.jpg" },
    { alt: "Blank row", src: "  " },
    { alt: "Product B", src: "/images/b.jpg" },
  ]);
});

test("publish preflight issue fix ignores nonblank or blocked image sources", () => {
  const schema = createGallerySchema();
  const nonblank = applyPublishPreflightIssueFix(schema, {
    field: "sections[2].props.images[0].src",
    message: "Image source needs review.",
    severity: "warning",
  });
  const blocked = applyPublishPreflightIssueFix(schema, {
    field: "sections[2].props.images[0].src",
    message: "Image source is unsafe.",
    severity: "error",
  });

  assert.equal(nonblank, null);
  assert.equal(blocked, null);
});

test("publish preflight issue fix ignores non-rich-text content fields", () => {
  const fixed = applyPublishPreflightIssueFix(exampleLandingPage, {
    field: "sections[0].props.content",
    message: "Content needs review.",
    severity: "warning",
  });

  assert.equal(fixed, null);
});

function createGallerySchema() {
  const schema = structuredClone(exampleLandingPage);
  schema.sections.push({
    component: "image-gallery",
    id: "gallery",
    layout: {
      desktop: { width: 1200, x: 0, y: 760 },
      mobile: { width: 390, x: 0, y: 820 },
    },
    props: {
      images: [{ alt: "Product", src: "/images/product.jpg" }],
    },
  });
  return schema;
}

test("publish preflight issue fix ignores unsupported issues", () => {
  const fixed = applyPublishPreflightIssueFix(exampleLandingPage, {
    field: "seo.ogImage",
    message: "Open Graph image needs review.",
    severity: "warning",
  });

  assert.equal(fixed, null);
});
