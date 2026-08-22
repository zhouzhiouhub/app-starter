import assert from "node:assert/strict";
import test from "node:test";
import { buildPublishedPageSitemapEntries } from "../src/lib/sitemap-entries.ts";

const basePage = {
  noIndex: false,
  publishedAt: null,
  title: "Page",
  updatedAt: "2026-08-21T00:00:00.000Z",
};

test("sitemap entries include published indexable pages once", () => {
  const entries = buildPublishedPageSitemapEntries({
    locale: "en-US",
    origin: "https://web.example.com",
    pages: [
      {
        ...basePage,
        publishedAt: "2026-08-20T00:00:00.000Z",
        slug: "home",
      },
      { ...basePage, slug: "/contact/" },
      { ...basePage, slug: "contact" },
    ],
  });

  assert.deepEqual(entries, [
    {
      changeFrequency: "daily",
      lastModified: "2026-08-20T00:00:00.000Z",
      priority: 1,
      url: "https://web.example.com/en",
    },
    {
      changeFrequency: "weekly",
      lastModified: "2026-08-21T00:00:00.000Z",
      priority: 0.7,
      url: "https://web.example.com/en/contact",
    },
  ]);
});

test("sitemap entries exclude noindex and system 404 pages", () => {
  const entries = buildPublishedPageSitemapEntries({
    locale: "en-US",
    origin: "https://web.example.com",
    pages: [
      { ...basePage, noIndex: true, slug: "legal/privacy" },
      { ...basePage, slug: "404" },
      { ...basePage, slug: "/system/404/" },
      { ...basePage, slug: "legal/terms" },
    ],
  });

  assert.deepEqual(entries.map((entry) => entry.url), [
    "https://web.example.com/en/legal/terms",
  ]);
});
