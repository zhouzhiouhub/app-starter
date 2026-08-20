import { redactSmokeSecrets } from "./smoke-secrets.mjs";

export async function assertStorefrontPage(input, title) {
  const url = joinUrl(
    input.webUrl,
    getStorefrontPath(input.locale, input.slug),
  );
  let lastError = "";

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
    } catch (error) {
      lastError = readErrorMessage(error);
    }

    if (attempt < input.retryAttempts) {
      await delay(input.retryDelayMs);
    }
  }

  throw new Error(
    `Storefront page did not show the published title (${lastError}).`,
  );
}

export function readStorefrontPageAttempt(response, title) {
  return {
    bodySnippet: response.ok ? null : readBodySnippet(response.text),
    ok: response.ok,
    status: response.status,
    statusText: response.statusText || "",
    titlePresent: response.text.includes(title),
  };
}

export function formatStorefrontPageAttempt(attempt) {
  const statusText = attempt.statusText ? ` ${attempt.statusText}` : "";
  const body = attempt.bodySnippet
    ? `, body: ${JSON.stringify(attempt.bodySnippet)}`
    : "";

  return `status ${attempt.status}${statusText}, title present: ${attempt.titlePresent}${body}`;
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
    throw new Error(
      `robots.txt failed (${formatRobotsAttempt(robotsAttempt)}).`,
    );
  }

  if (!robotsAttempt.hasUserAgent || !robotsAttempt.hasSitemapLine) {
    throw new Error(
      `robots.txt did not include user-agent and sitemap lines (${formatRobotsAttempt(
        robotsAttempt,
      )}).`,
    );
  }

  if (!robotsAttempt.pointsToSitemap) {
    throw new Error(
      `robots.txt did not point to the storefront sitemap (${formatRobotsAttempt(
        robotsAttempt,
      )}).`,
    );
  }

  console.log("robots.txt passed.");
}

export function readRobotsAttempt(response, webUrl) {
  const text = response.text.toLowerCase();
  const sitemapUrl = joinUrl(webUrl, "/sitemap.xml").toLowerCase();

  return {
    bodySnippet: response.ok ? null : readBodySnippet(response.text),
    hasSitemapLine: text.includes("sitemap:"),
    hasUserAgent: text.includes("user-agent"),
    ok: response.ok,
    pointsToSitemap: text.includes(sitemapUrl),
    status: response.status,
    statusText: response.statusText || "",
  };
}

export function formatRobotsAttempt(attempt) {
  const statusText = attempt.statusText ? ` ${attempt.statusText}` : "";
  const body = attempt.bodySnippet
    ? `, body: ${JSON.stringify(attempt.bodySnippet)}`
    : "";

  return `status ${attempt.status}${statusText}, user-agent: ${attempt.hasUserAgent}, sitemap line: ${attempt.hasSitemapLine}, sitemap URL: ${attempt.pointsToSitemap}${body}`;
}

export async function assertSitemap(input) {
  const url = joinUrl(input.webUrl, "/sitemap.xml");
  const expectedUrl = joinUrl(
    input.webUrl,
    getStorefrontPath(input.locale, input.slug),
  );
  let lastError = "";

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
    } catch (error) {
      lastError = readErrorMessage(error);
    }

    if (attempt < input.retryAttempts) {
      await delay(input.retryDelayMs);
    }
  }

  throw new Error(
    `sitemap.xml did not include the published page (${lastError}).`,
  );
}

export function readSitemapAttempt(response, expectedUrl) {
  const urls = parseSitemapUrls(response.text);

  return {
    bodySnippet: response.ok ? null : readBodySnippet(response.text),
    expectedUrlPresent: urls.includes(expectedUrl),
    notFoundUrlPresent: urls.some(isNotFoundSitemapUrl),
    ok: response.ok,
    status: response.status,
    statusText: response.statusText || "",
    urlCount: urls.length,
  };
}

export function formatSitemapAttempt(attempt) {
  const statusText = attempt.statusText ? ` ${attempt.statusText}` : "";
  const body = attempt.bodySnippet
    ? `, body: ${JSON.stringify(attempt.bodySnippet)}`
    : "";

  return `status ${attempt.status}${statusText}, expected URL present: ${attempt.expectedUrlPresent}, 404 present: ${attempt.notFoundUrlPresent}, URL count: ${attempt.urlCount}${body}`;
}

export async function assertNotFoundPage(input) {
  const slug = `${input.slug}-missing-${Date.now().toString(36)}`;
  const url = joinUrl(input.webUrl, getStorefrontPath(input.locale, slug));
  const response = await fetchText(url);
  const notFoundAttempt = readNotFoundAttempt(response);

  if (notFoundAttempt.status !== 404) {
    throw new Error(
      `Unknown storefront page did not return 404 (${formatNotFoundAttempt(
        notFoundAttempt,
      )}).`,
    );
  }

  if (!notFoundAttempt.noIndex) {
    throw new Error(
      `Unknown storefront page did not render noindex metadata (${formatNotFoundAttempt(
        notFoundAttempt,
      )}).`,
    );
  }

  console.log("404 page passed.");
}

export function readNotFoundAttempt(response) {
  const noIndex = hasNoIndexRobots(response.text);

  return {
    bodySnippet:
      response.status === 404 && noIndex
        ? null
        : readBodySnippet(response.text),
    noIndex,
    status: response.status,
    statusText: response.statusText || "",
  };
}

export function formatNotFoundAttempt(attempt) {
  const statusText = attempt.statusText ? ` ${attempt.statusText}` : "";
  const body = attempt.bodySnippet
    ? `, body: ${JSON.stringify(attempt.bodySnippet)}`
    : "";

  return `status ${attempt.status}${statusText}, noindex: ${attempt.noIndex}${body}`;
}

export function getStorefrontPath(locale, slug) {
  const prefix = locale.split("-")[0].toLowerCase();
  return slug === "home" ? `/${prefix}` : `/${prefix}/${slug}`;
}

export function joinUrl(origin, path) {
  return `${origin}${path.startsWith("/") ? path : `/${path}`}`;
}

export function parseSitemapUrls(xml) {
  return Array.from(xml.matchAll(/<loc>([^<]+)<\/loc>/g), (match) =>
    match[1].trim(),
  );
}

export function hasNoIndexRobots(html) {
  return Array.from(html.matchAll(/<meta\b[^>]*>/gi)).some((match) => {
    const tag = match[0];
    return (
      /\bname=["']robots["']/i.test(tag) &&
      /\bcontent=["'][^"']*\bnoindex\b[^"']*["']/i.test(tag)
    );
  });
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

function isNotFoundSitemapUrl(url) {
  const normalized = url.replace(/\/+$/, "");
  return normalized.endsWith("/404");
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readBodySnippet(text) {
  const snippet = redactSmokeSecrets(text)
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160);
  return snippet || null;
}

function readErrorMessage(error) {
  return redactSmokeSecrets(error instanceof Error ? error.message : error);
}
