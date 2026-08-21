import {
  formatNotFoundAttempt,
  formatRobotsAttempt,
  formatSitemapAttempt,
  getStorefrontPath,
  joinUrl,
  readNotFoundAttempt,
  readRobotsAttempt,
  readSitemapAttempt,
} from "./storefront-smoke-diagnostics.mjs";
import {
  delayStorefrontSmoke,
  fetchStorefrontText,
  readStorefrontSmokeErrorMessage,
} from "./storefront-smoke-http.mjs";

export async function assertRobots(input) {
  const url = joinUrl(input.webUrl, "/robots.txt");
  const response = await fetchStorefrontText(url);
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
      const response = await fetchStorefrontText(url);
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
      lastError = readStorefrontSmokeErrorMessage(error);
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
      await delayStorefrontSmoke(input.retryDelayMs);
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
  const response = await fetchStorefrontText(url);
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
