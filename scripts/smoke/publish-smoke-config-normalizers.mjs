const localeCodePattern = /^[a-z]{2}(?:-[A-Z]{2})?$/;
const marketCodePattern = /^[a-z][a-z0-9-]{1,15}$/;
const pageSlugPattern = /^[a-z0-9]+(?:[-/][a-z0-9]+)*$/;

export function normalizeApiBaseUrl(value) {
  const url = readSmokeUrl(value, "API_URL");
  const pathname = trimTrailingSlashes(url.pathname);

  if (pathname && pathname !== "/api/v1") {
    throw new Error("API_URL must be an origin URL or an /api/v1 base URL.");
  }

  return `${url.origin}/api/v1`;
}

export function normalizeWebOrigin(value) {
  return normalizeOrigin(value, "WEB_URL", "storefront origin", "a");
}

export function normalizeAdminOrigin(value) {
  return normalizeOrigin(value, "ADMIN_URL", "admin origin", "an");
}

export function normalizeSmokeLocale(value) {
  const locale = value.trim();

  if (!localeCodePattern.test(locale)) {
    throw new Error("SMOKE_LOCALE must look like en-US.");
  }

  return locale;
}

export function normalizeSmokeMarket(value) {
  const market = value.trim();

  if (!marketCodePattern.test(market)) {
    throw new Error("SMOKE_MARKET must be a lowercase market code.");
  }

  return market;
}

export function normalizeSmokeSlug(value) {
  const slug = value.trim();

  if (slug.length > 255 || !pageSlugPattern.test(slug)) {
    throw new Error(
      "SMOKE_PAGE_SLUG must use lowercase letters, numbers, hyphens, or slashes.",
    );
  }

  return slug;
}

export function normalizeSmokeBoolean(value, name) {
  const normalized = value.trim().toLowerCase();

  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }

  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }

  throw new Error(`${name} must be true or false.`);
}

export function normalizeSmokePositiveInt(value, name, range) {
  const normalized = value.trim();

  if (!/^\d+$/.test(normalized)) {
    throw new Error(`${name} must be a positive integer.`);
  }

  const number = Number(normalized);

  if (
    !Number.isSafeInteger(number) ||
    number < range.min ||
    number > range.max
  ) {
    throw new Error(`${name} must be between ${range.min} and ${range.max}.`);
  }

  return number;
}

function normalizeOrigin(value, name, label, article) {
  const url = readSmokeUrl(value, name);
  const pathname = trimTrailingSlashes(url.pathname);

  if (pathname) {
    throw new Error(`${name} must be ${article} ${label} without a path.`);
  }

  return url.origin;
}

function readSmokeUrl(value, name) {
  let url;

  try {
    url = new URL(value.trim());
  } catch {
    throw new Error(`${name} must be an absolute http(s) URL.`);
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error(`${name} must use http or https.`);
  }

  if (url.username || url.password) {
    throw new Error(`${name} must not include embedded credentials.`);
  }

  if (url.search || url.hash) {
    throw new Error(`${name} must not include query strings or fragments.`);
  }

  return url;
}

function trimTrailingSlashes(pathname) {
  return pathname.replace(/\/+$/, "");
}
