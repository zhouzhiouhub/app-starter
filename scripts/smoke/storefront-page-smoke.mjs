import {
  formatStorefrontPageAttempt,
  getStorefrontPath,
  hasNoIndexRobots,
  joinUrl,
  readStorefrontPageAttempt,
} from "./storefront-smoke-diagnostics.mjs";
import {
  delayStorefrontSmoke,
  fetchStorefrontText,
  readStorefrontSmokeErrorMessage,
} from "./storefront-smoke-http.mjs";

export async function assertStorefrontPage(input, title) {
  const url = joinUrl(
    input.webUrl,
    getStorefrontPath(input.locale, input.slug),
  );
  let lastError = "";
  let lastAttempt = null;

  for (let attempt = 1; attempt <= input.retryAttempts; attempt += 1) {
    try {
      const response = await fetchStorefrontText(url, input, { method: "GET" });
      const pageAttempt = readStorefrontPageAttempt(response, title);

      if (pageAttempt.ok && pageAttempt.titlePresent) {
        console.log("Storefront page passed.");
        return response.text;
      }

      lastError = formatStorefrontPageAttempt(pageAttempt);
      lastAttempt = pageAttempt;
    } catch (error) {
      lastError = readStorefrontSmokeErrorMessage(error);
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
      await delayStorefrontSmoke(input.retryDelayMs);
    }
  }

  throw createStorefrontPageFailure(
    url,
    title,
    `Storefront page did not show the published title (${lastError}).`,
    lastAttempt,
  );
}

export function assertIndexableStorefrontPage(html) {
  if (hasNoIndexRobots(html)) {
    throw new Error("Storefront page rendered noindex robots metadata.");
  }

  console.log("Storefront page SEO metadata passed.");
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
