import assert from "node:assert/strict";
import test from "node:test";
import {
  formatStorefrontPageAttempt,
  formatNotFoundAttempt,
  formatRobotsAttempt,
  formatSitemapAttempt,
  readStorefrontPageAttempt,
  readNotFoundAttempt,
  readRobotsAttempt,
  readSitemapAttempt,
} from "./storefront-smoke.mjs";

test("smoke helpers summarize storefront page attempts", () => {
  const failed = readStorefrontPageAttempt(
    {
      ok: false,
      status: 503,
      statusText: "Service Unavailable",
      text: "<html>\n<body>Storefront render failed</body>\n</html>",
    },
    "Published title",
  );

  assert.deepEqual(failed, {
    bodySnippet: "<html> <body>Storefront render failed</body> </html>",
    diagnosis: "http-error",
    documentTitle: null,
    ok: false,
    status: 503,
    statusText: "Service Unavailable",
    titlePresent: false,
  });
  assert.equal(
    formatStorefrontPageAttempt(failed),
    'status 503 Service Unavailable, diagnosis: http-error, title present: false, body: "<html> <body>Storefront render failed</body> </html>"',
  );

  const stale = readStorefrontPageAttempt(
    {
      ok: true,
      status: 200,
      statusText: "OK",
      text: "<html><head><title>Previous campaign</title></head><body>Old page content</body></html>",
    },
    "Published title",
  );

  assert.deepEqual(stale, {
    bodySnippet:
      "<html><head><title>Previous campaign</title></head><body>Old page content</body></html>",
    diagnosis: "stale-or-fallback-content",
    documentTitle: "Previous campaign",
    ok: true,
    status: 200,
    statusText: "OK",
    titlePresent: false,
  });
  assert.equal(
    formatStorefrontPageAttempt(stale),
    'status 200 OK, diagnosis: stale-or-fallback-content, title present: false, document title: "Previous campaign", body: "<html><head><title>Previous campaign</title></head><body>Old page content</body></html>"',
  );
});

test("smoke helpers summarize robots, sitemap, and 404 attempts", () => {
  const robots = readRobotsAttempt(
    {
      ok: true,
      status: 200,
      statusText: "OK",
      text: "User-agent: *\nDisallow:",
    },
    "https://web.example.com",
  );
  const sitemap = readSitemapAttempt(
    {
      ok: true,
      status: 200,
      statusText: "OK",
      text: `<?xml version="1.0"?>
<urlset>
  <url><loc>https://web.example.com/en/other</loc></url>
  <url><loc>https://web.example.com/404</loc></url>
</urlset>`,
    },
    "https://web.example.com/en/smoke-page",
  );
  const notFound = readNotFoundAttempt({
    ok: true,
    status: 200,
    statusText: "OK",
    text: "<html><body>Unexpected page</body></html>",
  });
  const missingNoIndex = readNotFoundAttempt({
    ok: false,
    status: 404,
    statusText: "Not Found",
    text: "<html><body>Missing page template</body></html>",
  });

  assert.deepEqual(robots, {
    bodySnippet: null,
    hasSitemapLine: false,
    hasUserAgent: true,
    ok: true,
    pointsToSitemap: false,
    status: 200,
    statusText: "OK",
  });
  assert.equal(
    formatRobotsAttempt(robots),
    "status 200 OK, user-agent: true, sitemap line: false, sitemap URL: false",
  );
  assert.deepEqual(sitemap, {
    bodySnippet: null,
    expectedUrlPresent: false,
    notFoundUrlPresent: true,
    ok: true,
    status: 200,
    statusText: "OK",
    urlCount: 2,
  });
  assert.equal(
    formatSitemapAttempt(sitemap),
    "status 200 OK, expected URL present: false, 404 present: true, URL count: 2",
  );
  assert.deepEqual(notFound, {
    bodySnippet: "<html><body>Unexpected page</body></html>",
    noIndex: false,
    status: 200,
    statusText: "OK",
  });
  assert.equal(
    formatNotFoundAttempt(notFound),
    'status 200 OK, noindex: false, body: "<html><body>Unexpected page</body></html>"',
  );
  assert.equal(
    formatNotFoundAttempt(missingNoIndex),
    'status 404 Not Found, noindex: false, body: "<html><body>Missing page template</body></html>"',
  );
});
