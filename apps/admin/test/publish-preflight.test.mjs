import assert from "node:assert/strict";
import test from "node:test";
import { exampleLandingPage } from "@app-starter/schema";
import {
  collectPublishPreflightIssues,
  findBlockingPublishPreflightIssue,
} from "../src/features/pages/publish-preflight.ts";

test("publish preflight accepts the example landing page", () => {
  const issues = collectPublishPreflightIssues(exampleLandingPage);

  assert.deepEqual(issues, []);
  assert.equal(findBlockingPublishPreflightIssue(exampleLandingPage), null);
});

test("publish preflight blocks unsafe chrome links", () => {
  const schema = structuredClone(exampleLandingPage);

  schema.chrome.header.content.navigation[0].href = "javascript:alert(1)";
  schema.chrome.header.content.localeSwitcher.locales[0].href = "";

  const issues = collectPublishPreflightIssues(schema);
  const blocker = findBlockingPublishPreflightIssue(schema);

  assert.equal(issues.length, 1);
  assert.equal(issues[0].field, "chrome.header.content.navigation[0].href");
  assert.equal(issues[0].severity, "error");
  assert.match(issues[0].message, /Header navigation link 1/);
  assert.equal(blocker?.field, "chrome.header.content.navigation[0].href");
});

test("publish preflight distinguishes SEO errors from warnings", () => {
  const schema = structuredClone(exampleLandingPage);

  schema.seo.canonical = "javascript:alert(1)";
  schema.seo.ogImage = "media://asset-1";

  const issues = collectPublishPreflightIssues(schema);
  const blocker = findBlockingPublishPreflightIssue(schema);

  assert.deepEqual(
    issues.map((issue) => [issue.field, issue.severity]),
    [
      ["seo.canonical", "error"],
      ["seo.ogImage", "warning"],
    ],
  );
  assert.equal(blocker?.field, "seo.canonical");
});

test("publish preflight flags invalid gallery image sources", () => {
  const schema = structuredClone(exampleLandingPage);

  schema.sections.push({
    id: "gallery",
    component: "image-gallery",
    props: {
      images: [
        { alt: "Unsafe", src: "javascript:alert(1)" },
        { alt: "Blank", src: "" },
        { alt: "Media", src: "media://asset-1" },
      ],
    },
    layout: {
      desktop: { x: 0, y: 900, width: 1200 },
      mobile: { x: 0, y: 900, width: 390 },
    },
  });

  const issues = collectPublishPreflightIssues(schema);
  const blocker = findBlockingPublishPreflightIssue(schema);

  assert.deepEqual(
    issues.map((issue) => [issue.field, issue.severity]),
    [
      ["sections[2].props.images[0].src", "error"],
      ["sections[2].props.images[1].src", "warning"],
    ],
  );
  assert.equal(blocker?.field, "sections[2].props.images[0].src");
});

test("publish preflight warns about missing gallery image alt text", () => {
  const schema = structuredClone(exampleLandingPage);

  schema.sections.push({
    id: "gallery",
    component: "image-gallery",
    props: {
      images: [{ alt: "", src: "/images/gallery.jpg" }],
    },
    layout: {
      desktop: { x: 0, y: 900, width: 1200 },
      mobile: { x: 0, y: 900, width: 390 },
    },
  });

  const issues = collectPublishPreflightIssues(schema);
  const blocker = findBlockingPublishPreflightIssue(schema);

  assert.deepEqual(
    issues.map((issue) => [issue.field, issue.severity]),
    [["sections[2].props.images[0].alt", "warning"]],
  );
  assert.equal(blocker, null);
});

test("publish preflight flags invalid section CTA links", () => {
  const schema = structuredClone(exampleLandingPage);

  schema.sections[0].props.ctaHref = "javascript:alert(1)";

  const issues = collectPublishPreflightIssues(schema);
  const blocker = findBlockingPublishPreflightIssue(schema);

  assert.deepEqual(
    issues.map((issue) => [issue.field, issue.severity]),
    [["sections[0].props.ctaHref", "error"]],
  );
  assert.equal(blocker?.field, "sections[0].props.ctaHref");
});

test("publish preflight warns about incomplete section CTA pairs", () => {
  const schema = structuredClone(exampleLandingPage);

  schema.sections[0].props.ctaHref = "";

  const issues = collectPublishPreflightIssues(schema);
  const blocker = findBlockingPublishPreflightIssue(schema);

  assert.deepEqual(
    issues.map((issue) => [issue.field, issue.severity]),
    [["sections[0].props.ctaHref", "warning"]],
  );
  assert.equal(blocker, null);
});

test("publish preflight warns about sanitized rich text content", () => {
  const schema = structuredClone(exampleLandingPage);

  schema.sections[1].props.content = {
    defaultValue: '<p onclick="alert(1)">Safe</p><script>alert(2)</script>',
  };

  const issues = collectPublishPreflightIssues(schema);
  const blocker = findBlockingPublishPreflightIssue(schema);

  assert.deepEqual(
    issues.map((issue) => [issue.field, issue.severity]),
    [["sections[1].props.content", "warning"]],
  );
  assert.equal(blocker, null);
});
