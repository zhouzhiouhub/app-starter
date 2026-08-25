import assert from "node:assert/strict";
import test from "node:test";
import {
  formatNotFoundAttempt,
  formatRobotsAttempt,
  formatSitemapAttempt,
  readNotFoundAttempt,
  readRobotsAttempt,
  readSitemapAttempt,
} from "./storefront-smoke.mjs";

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
    hasHostLine: false,
    hasSitemapLine: false,
    hasUserAgent: true,
    ok: true,
    pointsToHost: false,
    pointsToSitemap: false,
    status: 200,
    statusText: "OK",
  });
  assert.equal(
    formatRobotsAttempt(robots),
    "status 200 OK, user-agent: true, host line: false, host URL: false, sitemap line: false, sitemap URL: false",
  );
  assert.deepEqual(sitemap, {
    bodySnippet: null,
    expectedUrlPresent: false,
    firstOffOriginUrl: null,
    notFoundUrlPresent: true,
    offOriginUrlCount: 0,
    ok: true,
    status: 200,
    statusText: "OK",
    urlCount: 2,
  });
  assert.equal(
    formatSitemapAttempt(sitemap),
    "status 200 OK, expected URL present: false, 404 present: true, off-origin URLs: 0, URL count: 2",
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
