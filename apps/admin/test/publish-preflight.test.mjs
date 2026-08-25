import assert from "node:assert/strict";
import test from "node:test";
import { exampleLandingPage } from "@app-starter/schema";
import {
  collectPublishPreflightIssues,
  findBlockingPublishPreflightIssue,
  formatPublishPreflightWarningSummary,
  summarizePublishPreflightIssues,
} from "../src/features/pages/publish-preflight.ts";

test("publish preflight accepts the example landing page", () => {
  const issues = collectPublishPreflightIssues(exampleLandingPage);

  assert.deepEqual(issues, []);
  assert.equal(findBlockingPublishPreflightIssue(exampleLandingPage), null);
  assert.equal(formatPublishPreflightWarningSummary(issues), null);
});

test("publish preflight blocks non-default locale while multi-locale is disabled", () => {
  const schema = structuredClone(exampleLandingPage);
  schema.meta.locale = "de-DE";

  const issues = collectPublishPreflightIssues(schema);
  const blocker = findBlockingPublishPreflightIssue(schema);

  assert.deepEqual(
    issues.map((issue) => [issue.field, issue.severity]),
    [["meta.locale", "error"]],
  );
  assert.match(issues[0].message, /multi-locale is disabled/);
  assert.equal(blocker?.field, "meta.locale");
});

test("publish preflight allows non-default locale when multi-locale is enabled", () => {
  const schema = structuredClone(exampleLandingPage);
  schema.meta.locale = "de-DE";

  assert.deepEqual(
    collectPublishPreflightIssues(schema, { multiLocaleEnabled: true }),
    [],
  );
  assert.equal(
    findBlockingPublishPreflightIssue(schema, { multiLocaleEnabled: true }),
    null,
  );
});

test("publish preflight warns about stale section order data", () => {
  const schema = structuredClone(exampleLandingPage);
  schema.layout.desktop.sectionOrder = ["copy", "missing", "copy"];

  const issues = collectPublishPreflightIssues(schema);
  const blocker = findBlockingPublishPreflightIssue(schema);

  assert.deepEqual(
    issues.map((issue) => [issue.field, issue.severity]),
    [["layout.desktop.sectionOrder", "warning"]],
  );
  assert.match(issues[0].message, /section order will be normalized/);
  assert.equal(blocker, null);
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

test("publish preflight explains sensitive link parameters", () => {
  const schema = structuredClone(exampleLandingPage);

  schema.chrome.header.content.navigation[0].href =
    "https://example.com/private?token=secret";
  schema.sections[0].props.ctaHref =
    "https://example.com/signup?authorization_code=oauth-code";

  const issues = collectPublishPreflightIssues(schema);

  assert.deepEqual(
    issues.map((issue) => [issue.field, issue.severity]),
    [
      ["chrome.header.content.navigation[0].href", "error"],
      ["sections[0].props.ctaHref", "error"],
    ],
  );
  assert.match(issues[0].message, /Remove token, secret, credential/);
  assert.match(issues[1].message, /Remove token, secret, credential/);
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

test("publish preflight warns when canonical leaves the storefront origin", () => {
  const schema = structuredClone(exampleLandingPage);
  schema.seo.canonical = "https://legacy.example.com/en/smoke-page";

  assert.deepEqual(collectPublishPreflightIssues(schema), []);

  const issues = collectPublishPreflightIssues(schema, {
    siteDomain: "Store.Brand-Platform.com:443",
  });
  const blocker = findBlockingPublishPreflightIssue(schema, {
    siteDomain: "Store.Brand-Platform.com:443",
  });

  assert.deepEqual(
    issues.map((issue) => [issue.field, issue.severity]),
    [["seo.canonical", "warning"]],
  );
  assert.match(
    issues[0].message,
    /Canonical URL points to https:\/\/legacy\.example\.com/,
  );
  assert.equal(blocker, null);

  schema.seo.canonical = "https://store.brand-platform.com/en/smoke-page";
  assert.deepEqual(
    collectPublishPreflightIssues(schema, {
      siteDomain: "Store.Brand-Platform.com:443",
    }),
    [],
  );
});

test("publish preflight flags invalid gallery image sources", () => {
  const schema = structuredClone(exampleLandingPage);

  schema.sections.push({
    id: "gallery",
    component: "image-gallery",
    props: {
      images: [
        { alt: "Unsafe", src: "javascript:alert(1)" },
        { alt: "HTTP", src: "http://cdn.example.com/gallery.jpg" },
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
      ["sections[2].props.images[1].src", "error"],
      ["sections[2].props.images[2].src", "warning"],
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

test("publish preflight summarizes non-blocking warnings", () => {
  const schema = structuredClone(exampleLandingPage);

  schema.seo.ogImage = "media://asset-1";
  schema.sections[0].props.ctaHref = "";
  schema.sections[1].props.content = {
    defaultValue: '<p onclick="alert(1)">Safe</p>',
  };
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
  const summary = formatPublishPreflightWarningSummary(issues);

  assert.match(summary ?? "", /^Review 4 non-blocking publish warnings:/);
  assert.match(summary ?? "", /Open Graph image:/);
  assert.match(summary ?? "", /hero-banner CTA link:/);
  assert.match(summary ?? "", /Rich text section 2:/);
  assert.match(summary ?? "", /1 more warning also needs review\./);
});

test("publish preflight summarizes readiness counts", () => {
  assert.deepEqual(summarizePublishPreflightIssues([]), {
    errorCount: 0,
    message: "Publish checks passed.",
    status: "ready",
    warningCount: 0,
  });

  assert.deepEqual(
    summarizePublishPreflightIssues([
      {
        field: "seo.ogImage",
        message: "Open Graph image needs review.",
        severity: "warning",
      },
    ]),
    {
      errorCount: 0,
      message: "Publish has 1 non-blocking warning.",
      status: "warning",
      warningCount: 1,
    },
  );
});

test("publish preflight marks readiness as blocked when errors exist", () => {
  const summary = summarizePublishPreflightIssues([
    {
      field: "seo.canonical",
      message: "Canonical URL is unsafe.",
      severity: "error",
    },
    {
      field: "seo.ogImage",
      message: "Open Graph image needs review.",
      severity: "warning",
    },
  ]);

  assert.deepEqual(summary, {
    errorCount: 1,
    message: "Publish blocked by 1 error and 1 non-blocking warning.",
    status: "blocked",
    warningCount: 1,
  });
});
