import {
  formatNotFoundAttempt,
  formatRobotsAttempt,
  formatSitemapAttempt,
  getExpectedStorefrontOrigin,
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
  const expectedOrigin = getExpectedStorefrontOrigin(input);
  const expectedHostUrl = expectedOrigin;
  const expectedSitemapUrl = joinUrl(expectedOrigin, "/sitemap.xml");
  const response = await fetchStorefrontText(url, input);
  const robotsAttempt = readRobotsAttempt(response, expectedOrigin);

  if (!response.ok) {
    throw createSeoSmokeFailure(
      "robots",
      url,
      `robots.txt failed (${formatRobotsAttempt(robotsAttempt)}).`,
      robotsAttempt,
      { expectedHostUrl, expectedSitemapUrl },
    );
  }

  if (
    !robotsAttempt.hasUserAgent ||
    !robotsAttempt.hasHostLine ||
    !robotsAttempt.hasSitemapLine
  ) {
    throw createSeoSmokeFailure(
      "robots",
      url,
      `robots.txt did not include user-agent, host, and sitemap lines (${formatRobotsAttempt(
        robotsAttempt,
      )}).`,
      robotsAttempt,
      { expectedHostUrl, expectedSitemapUrl },
    );
  }

  if (!robotsAttempt.pointsToHost) {
    throw createSeoSmokeFailure(
      "robots",
      url,
      `robots.txt did not point to the storefront host (${formatRobotsAttempt(
        robotsAttempt,
      )}).`,
      robotsAttempt,
      { expectedHostUrl, expectedSitemapUrl },
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
      { expectedHostUrl, expectedSitemapUrl },
    );
  }

  console.log("robots.txt passed.");
}

export async function assertSitemap(input) {
  const url = joinUrl(input.webUrl, "/sitemap.xml");
  const expectedUrl = joinUrl(
    getExpectedStorefrontOrigin(input),
    getStorefrontPath(input.locale, input.slug),
  );
  const expectedOrigin = getExpectedStorefrontOrigin(input);
  let lastError = "";
  let lastAttempt = null;

  for (let attempt = 1; attempt <= input.retryAttempts; attempt += 1) {
    try {
      const response = await fetchStorefrontText(url, input);
      const sitemapAttempt = readSitemapAttempt(response, expectedUrl);

      if (
        sitemapAttempt.ok &&
        sitemapAttempt.expectedUrlPresent &&
        !sitemapAttempt.notFoundUrlPresent &&
        sitemapAttempt.offOriginUrlCount === 0
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
        firstOffOriginUrl: null,
        notFoundUrlPresent: false,
        offOriginUrlCount: 0,
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
    `sitemap.xml did not match the expected storefront URLs (${lastError}).`,
    lastAttempt,
    { expectedOrigin, expectedUrl },
  );
}

export async function assertNotFoundPage(input) {
  const slug = `${input.slug}-missing-${Date.now().toString(36)}`;
  const url = joinUrl(input.webUrl, getStorefrontPath(input.locale, slug));
  const response = await fetchStorefrontText(url, input);
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
