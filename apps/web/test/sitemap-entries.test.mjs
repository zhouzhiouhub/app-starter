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
    origin: "https://web.brand-platform.com",
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
      url: "https://web.brand-platform.com/en",
    },
    {
      changeFrequency: "weekly",
      lastModified: "2026-08-21T00:00:00.000Z",
      priority: 0.7,
      url: "https://web.brand-platform.com/en/contact",
    },
  ]);
});

test("sitemap entries exclude noindex and system 404 pages", () => {
  const entries = buildPublishedPageSitemapEntries({
    locale: "en-US",
    origin: "https://web.brand-platform.com",
    pages: [
      { ...basePage, noIndex: true, slug: "legal/privacy" },
      { ...basePage, slug: "404" },
      { ...basePage, slug: "/system/404/" },
      { ...basePage, slug: "legal/terms" },
    ],
  });

  assert.deepEqual(entries.map((entry) => entry.url), [
    "https://web.brand-platform.com/en/legal/terms",
  ]);
});

test("sitemap entries skip invalid page slugs", () => {
  const entries = buildPublishedPageSitemapEntries({
    locale: "en-US",
    origin: "https://web.brand-platform.com",
    pages: [
      { ...basePage, slug: "home" },
      { ...basePage, slug: "../admin" },
      { ...basePage, slug: "bad slug" },
      { ...basePage, slug: "campaign<script>" },
    ],
  });

  assert.deepEqual(entries.map((entry) => entry.url), [
    "https://web.brand-platform.com/en",
  ]);
});

test("sitemap entries require valid last modified timestamps", () => {
  const entries = buildPublishedPageSitemapEntries({
    locale: "en-US",
    origin: "https://web.brand-platform.com",
    pages: [
      {
        ...basePage,
        publishedAt: "2026-08-20T00:00:00Z",
        slug: "home",
        updatedAt: "2026-08-21T00:00:00Z",
      },
      {
        ...basePage,
        publishedAt: "bad-date",
        slug: "contact",
        updatedAt: "2026-08-22T00:00:00Z",
      },
      {
        ...basePage,
        publishedAt: "bad-date",
        slug: "broken",
        updatedAt: "also-bad",
      },
    ],
  });

  assert.deepEqual(entries, [
    {
      changeFrequency: "daily",
      lastModified: "2026-08-20T00:00:00.000Z",
      priority: 1,
      url: "https://web.brand-platform.com/en",
    },
    {
      changeFrequency: "weekly",
      lastModified: "2026-08-22T00:00:00.000Z",
      priority: 0.7,
      url: "https://web.brand-platform.com/en/contact",
    },
  ]);
});

test("sitemap entries ignore unsafe public origins", () => {
  const entries = buildPublishedPageSitemapEntries({
    locale: "en-US",
    origin: "http://web.brand-platform.com",
    pages: [{ ...basePage, slug: "home" }],
  });

  assert.deepEqual(entries, []);
});

test("sitemap entries ignore origins with credentials or paths", () => {
  for (const origin of [
    "https://user:pass@web.brand-platform.com",
    "https://web.brand-platform.com/path",
    "https://web.brand-platform.com?token=secret",
    "https://web.brand-platform.com#fragment",
  ]) {
    const entries = buildPublishedPageSitemapEntries({
      locale: "en-US",
      origin,
      pages: [{ ...basePage, slug: "home" }],
    });

    assert.deepEqual(entries, []);
  }
});

test("sitemap entries allow localhost HTTP origins for local development", () => {
  const entries = buildPublishedPageSitemapEntries({
    locale: "en-US",
    origin: "http://localhost:3000",
    pages: [{ ...basePage, slug: "home" }],
  });

  assert.equal(entries[0]?.url, "http://localhost:3000/en");
});
