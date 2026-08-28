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
  const details = createStarterPagesSmokeDetails(input.locale);

  for (const page of starterPublicPages) {
    await assertPublicPublishedPage(input, page);
  }

  for (const page of starterStorefrontPages) {
    const pageInput = { ...input, slug: page.slug };
    const html = await assertStorefrontPage(pageInput, page.title);
    assertIndexableStorefrontPage(html, pageInput);
  }

  console.log("Starter pages passed.");

  return details;
}

export function createStarterPagesSmokeDetails(locale) {
  return {
    publicPages: starterPublicPages.map((page) =>
      readStarterPageSummary(page, locale),
    ),
    storefrontPages: starterStorefrontPages.map((page) =>
      readStarterPageSummary(page, locale),
    ),
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
