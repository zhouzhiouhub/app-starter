import assert from "node:assert/strict";
import test from "node:test";
import {
  assertNotFoundPage,
  assertRobots,
  assertSitemap,
  formatNotFoundAttempt,
  formatRobotsAttempt,
  formatSitemapAttempt,
  readNotFoundAttempt,
  readRobotsAttempt,
  readSitemapAttempt,
} from "./storefront-smoke.mjs";

test("SEO smoke failures keep structured diagnostics", async () => {
  await withFetch(
    async () =>
      new Response("User-agent: *\nDisallow:", {
        status: 200,
        statusText: "OK",
      }),
    async () => {
      await assert.rejects(
        () => assertRobots({ webUrl: "https://web.example.com" }),
        (error) => {
          assert.deepEqual(error.smokeDetails.robots, {
            bodySnippet: null,
            expectedSitemapUrl: "https://web.example.com/sitemap.xml",
            hasSitemapLine: false,
            hasUserAgent: true,
            ok: true,
            pointsToSitemap: false,
            status: 200,
            statusText: "OK",
            url: "https://web.example.com/robots.txt",
          });

          return true;
        },
      );
    },
  );

  await withFetch(
    async () =>
      new Response(
        [
          "<?xml version=\"1.0\"?>",
          "<urlset>",
          "  <url><loc>https://web.example.com/en/other</loc></url>",
          "</urlset>",
        ].join("\n"),
        {
          status: 200,
          statusText: "OK",
        },
      ),
    async () => {
      await assert.rejects(
        () =>
          assertSitemap({
            locale: "en-US",
            retryAttempts: 1,
            retryDelayMs: 1,
            slug: "smoke-page",
            webUrl: "https://web.example.com",
          }),
        (error) => {
          assert.deepEqual(error.smokeDetails.sitemap, {
            bodySnippet: null,
            expectedUrl: "https://web.example.com/en/smoke-page",
            expectedUrlPresent: false,
            notFoundUrlPresent: false,
            ok: true,
            status: 200,
            statusText: "OK",
            url: "https://web.example.com/sitemap.xml",
            urlCount: 1,
          });

          return true;
        },
      );
    },
  );

  await withFetchAndNow(
    async () =>
      new Response("<html><body>Unexpected page</body></html>", {
        status: 200,
        statusText: "OK",
      }),
    () => 123456789,
    async () => {
      await assert.rejects(
        () =>
          assertNotFoundPage({
            locale: "en-US",
            slug: "smoke-page",
            webUrl: "https://web.example.com",
          }),
        (error) => {
          assert.deepEqual(error.smokeDetails.notFound, {
            bodySnippet: "<html><body>Unexpected page</body></html>",
            noIndex: false,
            status: 200,
            statusText: "OK",
            url: "https://web.example.com/en/smoke-page-missing-21i3v9",
          });

          return true;
        },
      );
    },
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

async function withFetch(fetchImplementation, fn) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = fetchImplementation;

  try {
    await fn();
  } finally {
    globalThis.fetch = originalFetch;
  }
}

async function withFetchAndNow(fetchImplementation, now, fn) {
  const originalNow = Date.now;

  Date.now = now;

  try {
    await withFetch(fetchImplementation, fn);
  } finally {
    Date.now = originalNow;
  }
}
