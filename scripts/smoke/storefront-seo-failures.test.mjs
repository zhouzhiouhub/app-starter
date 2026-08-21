import assert from "node:assert/strict";
import test from "node:test";
import {
  assertNotFoundPage,
  assertRobots,
  assertSitemap,
} from "./storefront-smoke.mjs";
import { withFetch, withFetchAndNow } from "./smoke-test-runtime.mjs";

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
          '<?xml version="1.0"?>',
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

test("SEO smoke forwards the configured storefront host", async () => {
  const calls = [];
  const input = {
    locale: "en-US",
    retryAttempts: 1,
    retryDelayMs: 1,
    slug: "smoke-page",
    storefrontHost: "store.brand-platform.com",
    webUrl: "https://web.example.com",
  };

  await withFetchAndNow(
    async (url, init = {}) => {
      calls.push({ headers: init.headers ?? {}, url });

      if (url === "https://web.example.com/robots.txt") {
        return new Response(
          "User-agent: *\nSitemap: https://web.example.com/sitemap.xml\n",
          {
            status: 200,
            statusText: "OK",
          },
        );
      }

      if (url === "https://web.example.com/sitemap.xml") {
        return new Response(
          [
            '<?xml version="1.0"?>',
            "<urlset>",
            "  <url><loc>https://web.example.com/en/smoke-page</loc></url>",
            "</urlset>",
          ].join("\n"),
          {
            status: 200,
            statusText: "OK",
          },
        );
      }

      if (url === "https://web.example.com/en/smoke-page-missing-21i3v9") {
        return new Response(
          '<html><head><meta name="robots" content="noindex" /></head></html>',
          {
            status: 404,
            statusText: "Not Found",
          },
        );
      }

      throw new Error(`Unexpected fetch URL: ${url}`);
    },
    () => 123456789,
    async () => {
      await assertRobots(input);
      await assertSitemap(input);
      await assertNotFoundPage(input);
    },
  );

  assert.deepEqual(
    calls.map((call) => call.headers),
    [
      { "x-storefront-host": "store.brand-platform.com" },
      { "x-storefront-host": "store.brand-platform.com" },
      { "x-storefront-host": "store.brand-platform.com" },
    ],
  );
});
