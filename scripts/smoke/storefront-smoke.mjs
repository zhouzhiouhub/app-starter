import { redactSmokeSecrets } from "./smoke-secrets.mjs";
import {
  formatNotFoundAttempt,
  formatRobotsAttempt,
  formatSitemapAttempt,
  formatStorefrontPageAttempt,
  getStorefrontPath,
  hasNoIndexRobots,
  joinUrl,
  readNotFoundAttempt,
  readRobotsAttempt,
  readSitemapAttempt,
  readStorefrontPageAttempt,
} from "./storefront-smoke-diagnostics.mjs";

export {
  formatNotFoundAttempt,
  formatRobotsAttempt,
  formatSitemapAttempt,
  formatStorefrontPageAttempt,
  getStorefrontPath,
  hasNoIndexRobots,
  joinUrl,
  parseSitemapUrls,
  readNotFoundAttempt,
  readRobotsAttempt,
  readSitemapAttempt,
  readStorefrontPageAttempt,
} from "./storefront-smoke-diagnostics.mjs";

export async function assertStorefrontPage(input, title) {
  const url = joinUrl(
    input.webUrl,
    getStorefrontPath(input.locale, input.slug),
  );
  let lastError = "";
  let lastAttempt = null;

  for (let attempt = 1; attempt <= input.retryAttempts; attempt += 1) {
    try {
      const response = await fetch(url, { method: "GET" });
      const text = await response.text();
      const pageAttempt = readStorefrontPageAttempt(
        {
          ok: response.ok,
          status: response.status,
          statusText: response.statusText,
          text,
        },
        title,
      );

      if (pageAttempt.ok && pageAttempt.titlePresent) {
        console.log("Storefront page passed.");
        return text;
      }

      lastError = formatStorefrontPageAttempt(pageAttempt);
      lastAttempt = pageAttempt;
    } catch (error) {
      lastError = readErrorMessage(error);
      lastAttempt = {
        bodySnippet: null,
        diagnosis: "request-failed",
        documentTitle: null,
        error: lastError,
        ok: false,
        status: null,
        statusText: "",
        titlePresent: false,
      };
    }

    if (attempt < input.retryAttempts) {
      await delay(input.retryDelayMs);
    }
  }

  throw createStorefrontPageFailure(
    url,
    title,
    `Storefront page did not show the published title (${lastError}).`,
    lastAttempt,
  );
}

function createStorefrontPageFailure(url, expectedTitle, message, attempt) {
  const error = new Error(message);
  error.smokeDetails = {
    storefront: {
      ...(attempt ?? {}),
      expectedTitle,
      url,
    },
  };

  return error;
}

export function assertIndexableStorefrontPage(html) {
  if (hasNoIndexRobots(html)) {
    throw new Error("Storefront page rendered noindex robots metadata.");
  }

  console.log("Storefront page SEO metadata passed.");
}

export async function assertRobots(input) {
  const url = joinUrl(input.webUrl, "/robots.txt");
  const response = await fetchText(url);
  const robotsAttempt = readRobotsAttempt(response, input.webUrl);

  if (!response.ok) {
    throw createSeoSmokeFailure(
      "robots",
      url,
      `robots.txt failed (${formatRobotsAttempt(robotsAttempt)}).`,
      robotsAttempt,
      { expectedSitemapUrl: joinUrl(input.webUrl, "/sitemap.xml") },
    );
  }

  if (!robotsAttempt.hasUserAgent || !robotsAttempt.hasSitemapLine) {
    throw createSeoSmokeFailure(
      "robots",
      url,
      `robots.txt did not include user-agent and sitemap lines (${formatRobotsAttempt(
        robotsAttempt,
      )}).`,
      robotsAttempt,
      { expectedSitemapUrl: joinUrl(input.webUrl, "/sitemap.xml") },
    );
  }

  if (!robotsAttempt.pointsToSitemap) {
    throw createSeoSmokeFailure(
      "robots",
      url,
      `robots.txt did not point to the storefront sitemap (${formatRobotsAttempt(
        robotsAttempt,
      )}).`,
      robotsAttempt,
      { expectedSitemapUrl: joinUrl(input.webUrl, "/sitemap.xml") },
    );
  }

  console.log("robots.txt passed.");
}

export async function assertSitemap(input) {
  const url = joinUrl(input.webUrl, "/sitemap.xml");
  const expectedUrl = joinUrl(
    input.webUrl,
    getStorefrontPath(input.locale, input.slug),
  );
  let lastError = "";
  let lastAttempt = null;

  for (let attempt = 1; attempt <= input.retryAttempts; attempt += 1) {
    try {
      const response = await fetchText(url);
      const sitemapAttempt = readSitemapAttempt(response, expectedUrl);

      if (
        sitemapAttempt.ok &&
        sitemapAttempt.expectedUrlPresent &&
        !sitemapAttempt.notFoundUrlPresent
      ) {
        console.log("sitemap.xml passed.");
        return;
      }

      lastError = formatSitemapAttempt(sitemapAttempt);
      lastAttempt = sitemapAttempt;
    } catch (error) {
      lastError = readErrorMessage(error);
      lastAttempt = {
        bodySnippet: null,
        error: lastError,
        expectedUrlPresent: false,
        notFoundUrlPresent: false,
        ok: false,
        status: null,
        statusText: "",
        urlCount: 0,
      };
    }

    if (attempt < input.retryAttempts) {
      await delay(input.retryDelayMs);
    }
  }

  throw createSeoSmokeFailure(
    "sitemap",
    url,
    `sitemap.xml did not include the published page (${lastError}).`,
    lastAttempt,
    { expectedUrl },
  );
}

export async function assertNotFoundPage(input) {
  const slug = `${input.slug}-missing-${Date.now().toString(36)}`;
  const url = joinUrl(input.webUrl, getStorefrontPath(input.locale, slug));
  const response = await fetchText(url);
  const notFoundAttempt = readNotFoundAttempt(response);

  if (notFoundAttempt.status !== 404) {
    throw createSeoSmokeFailure(
      "notFound",
      url,
      `Unknown storefront page did not return 404 (${formatNotFoundAttempt(
        notFoundAttempt,
      )}).`,
      notFoundAttempt,
    );
  }

  if (!notFoundAttempt.noIndex) {
    throw createSeoSmokeFailure(
      "notFound",
      url,
      `Unknown storefront page did not render noindex metadata (${formatNotFoundAttempt(
        notFoundAttempt,
      )}).`,
      notFoundAttempt,
    );
  }

  console.log("404 page passed.");
}

function createSeoSmokeFailure(key, url, message, attempt, extra = {}) {
  const error = new Error(message);
  error.smokeDetails = {
    [key]: {
      ...(attempt ?? {}),
      ...extra,
      url,
    },
  };

  return error;
}

async function fetchText(url, init) {
  const response = await fetch(url, init);
  const text = await response.text();

  return {
    ok: response.ok,
    status: response.status,
    statusText: response.statusText,
    text,
    url,
  };
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readErrorMessage(error) {
  return redactSmokeSecrets(error instanceof Error ? error.message : error);
}
