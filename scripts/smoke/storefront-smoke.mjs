export async function assertStorefrontPage(input, title) {
  const url = joinUrl(input.webUrl, getStorefrontPath(input.locale, input.slug));
  let lastError = "";

  for (let attempt = 1; attempt <= input.retryAttempts; attempt += 1) {
    try {
      const response = await fetch(url, { method: "GET" });
      const text = await response.text();

      if (response.ok && text.includes(title)) {
        console.log("Storefront page passed.");
        return text;
      }

      lastError = `status ${response.status}, title present: ${text.includes(title)}`;
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

export function assertIndexableStorefrontPage(html) {
  if (hasNoIndexRobots(html)) {
    throw new Error("Storefront page rendered noindex robots metadata.");
  }

  console.log("Storefront page SEO metadata passed.");
}

export async function assertRobots(input) {
  const url = joinUrl(input.webUrl, "/robots.txt");
  const response = await fetchText(url);
  const text = response.text.toLowerCase();

  if (!response.ok) {
    throw new Error(readHttpTextError(response, "robots.txt failed."));
  }

  if (!text.includes("user-agent") || !text.includes("sitemap:")) {
    throw new Error("robots.txt did not include user-agent and sitemap lines.");
  }

  if (!text.includes(joinUrl(input.webUrl, "/sitemap.xml").toLowerCase())) {
    throw new Error("robots.txt did not point to the storefront sitemap.");
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

  for (let attempt = 1; attempt <= input.retryAttempts; attempt += 1) {
    try {
      const response = await fetchText(url);
      const urls = parseSitemapUrls(response.text);

      if (
        response.ok &&
        urls.includes(expectedUrl) &&
        !urls.some(isNotFoundSitemapUrl)
      ) {
        console.log("sitemap.xml passed.");
        return;
      }

      lastError = `status ${response.status}, expected URL present: ${urls.includes(
        expectedUrl,
      )}, 404 present: ${urls.some(isNotFoundSitemapUrl)}`;
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

export async function assertNotFoundPage(input) {
  const slug = `${input.slug}-missing-${Date.now().toString(36)}`;
  const url = joinUrl(input.webUrl, getStorefrontPath(input.locale, slug));
  const response = await fetchText(url);

  if (response.status !== 404) {
    throw new Error(
      `Unknown storefront page returned ${response.status}, not 404.`,
    );
  }

  if (!hasNoIndexRobots(response.text)) {
    throw new Error("Unknown storefront page did not render noindex metadata.");
  }

  console.log("404 page passed.");
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

function readHttpTextError(response, fallback) {
  const message = response.statusText || response.text.slice(0, 160) || fallback;
  return `${fallback} ${response.status}: ${message}`;
}

function readErrorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}
