import assert from "node:assert/strict";
import test from "node:test";
import { assertStarterPages } from "./starter-pages-smoke.mjs";
import { withFetch } from "./smoke-test-runtime.mjs";

const starterPageTitles = {
  404: "Page not found",
  home: "Home",
  privacy: "Privacy Policy",
  terms: "Terms of Service",
};

test("starter pages smoke checks public API and storefront routes", async () => {
  const calls = [];

  await withFetch(
    async (url, init = {}) => {
      calls.push({
        headers: init.headers ?? {},
        method: init.method ?? "GET",
        redirect: init.redirect,
        url,
      });

      if (url.startsWith("https://api.example.com/public/pages/")) {
        return createPublicPageResponse(readApiSlug(url));
      }

      if (url.startsWith("https://web.example.com/")) {
        return createStorefrontResponse(url);
      }

      throw new Error(`Unexpected fetch URL: ${url}`);
    },
    async () => {
      const result = await assertStarterPages({
        apiBaseUrl: "https://api.example.com",
        locale: "en-US",
        market: "us",
        retryAttempts: 1,
        retryDelayMs: 1,
        webUrl: "https://web.example.com",
      });

      assert.deepEqual(result, {
        publicPages: [
          { noIndex: false, path: "/en", slug: "home", title: "Home" },
          {
            noIndex: false,
            path: "/en/privacy",
            slug: "privacy",
            title: "Privacy Policy",
          },
          {
            noIndex: false,
            path: "/en/terms",
            slug: "terms",
            title: "Terms of Service",
          },
          {
            noIndex: true,
            path: "/en/404",
            slug: "404",
            title: "Page not found",
          },
        ],
        storefrontPages: [
          { noIndex: false, path: "/en", slug: "home", title: "Home" },
          {
            noIndex: false,
            path: "/en/privacy",
            slug: "privacy",
            title: "Privacy Policy",
          },
          {
            noIndex: false,
            path: "/en/terms",
            slug: "terms",
            title: "Terms of Service",
          },
        ],
      });
    },
  );

  assert.deepEqual(
    calls.map(({ url }) => url),
    [
      "https://api.example.com/public/pages/home?locale=en-US&market=us",
      "https://api.example.com/public/pages/privacy?locale=en-US&market=us",
      "https://api.example.com/public/pages/terms?locale=en-US&market=us",
      "https://api.example.com/public/pages/404?locale=en-US&market=us",
      "https://web.example.com/en",
      "https://web.example.com/en/privacy",
      "https://web.example.com/en/terms",
    ],
  );
  assert.equal(calls.every((call) => call.redirect === "manual"), true);
});

test("starter pages smoke forwards configured storefront hosts", async () => {
  const calls = [];

  await withFetch(
    async (url, init = {}) => {
      calls.push({ headers: init.headers ?? {}, url });
      return url.startsWith("https://api.example.com/public/pages/")
        ? createPublicPageResponse(readApiSlug(url))
        : createStorefrontResponse(url, "https://store.brand-platform.com");
    },
    async () => {
      await assertStarterPages({
        apiBaseUrl: "https://api.example.com",
        locale: "en-US",
        market: "us",
        retryAttempts: 1,
        retryDelayMs: 1,
        storefrontHost: "store.brand-platform.com",
        webUrl: "https://web.example.com",
      });
    },
  );

  assert.equal(
    calls.every(
      (call) => call.headers["x-storefront-host"] === "store.brand-platform.com",
    ),
    true,
  );
});

function createPublicPageResponse(slug) {
  return new Response(
    JSON.stringify({
      data: {
        meta: {
          title: starterPageTitles[slug],
        },
        seo: {
          noIndex: slug === "404",
        },
      },
      meta: {
        fallbackLocale: "en-US",
        isFallback: false,
        locale: "en-US",
      },
    }),
    {
      headers: { "Content-Type": "application/json" },
      status: 200,
      statusText: "OK",
    },
  );
}

function createStorefrontResponse(url, canonicalOrigin = "https://web.example.com") {
  const path = new URL(url).pathname;
  const slug = path === "/en" ? "home" : path.replace(/^\/en\//, "");
  const title = starterPageTitles[slug];
  const canonical = `${canonicalOrigin}${path}`;

  return new Response(
    [
      "<html><head>",
      `<title>${title}</title>`,
      `<link rel="canonical" href="${canonical}" />`,
      `<meta property="og:url" content="${canonical}" />`,
      "</head>",
      `<body>${title}</body></html>`,
    ].join(""),
    {
      status: 200,
      statusText: "OK",
    },
  );
}

function readApiSlug(url) {
  return new URL(url).pathname.split("/").pop();
}
