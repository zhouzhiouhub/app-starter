import {
  assertIndexableStorefrontPage,
  assertStorefrontPage,
} from "./storefront-page-smoke.mjs";
import { assertPublicPublishedPage } from "./public-api-smoke.mjs";
import { getStorefrontPath } from "./storefront-smoke-diagnostics.mjs";

const starterPublicPages = [
  {
    slug: "home",
    title: "Home",
  },
  {
    slug: "privacy",
    title: "Privacy Policy",
  },
  {
    slug: "terms",
    title: "Terms of Service",
  },
  {
    expectedNoIndex: true,
    slug: "404",
    title: "Page not found",
  },
];

const starterStorefrontPages = starterPublicPages.filter(
  (page) => page.expectedNoIndex !== true,
);

export async function assertStarterPages(input) {
  const publicPages = [];
  const storefrontPages = [];

  for (const page of starterPublicPages) {
    await assertPublicPublishedPage(input, page);
    publicPages.push(readStarterPageSummary(page, input.locale));
  }

  for (const page of starterStorefrontPages) {
    const pageInput = { ...input, slug: page.slug };
    const html = await assertStorefrontPage(pageInput, page.title);
    assertIndexableStorefrontPage(html, pageInput);
    storefrontPages.push(readStarterPageSummary(page, input.locale));
  }

  console.log("Starter pages passed.");

  return {
    publicPages,
    storefrontPages,
  };
}

function readStarterPageSummary(page, locale) {
  return {
    noIndex: page.expectedNoIndex === true,
    path: getStorefrontPath(locale, page.slug),
    slug: page.slug,
    title: page.title,
  };
}
