import { randomUUID } from "node:crypto";
import { assertFeatureFlagsDisabled } from "./feature-flags-smoke.mjs";
import { buildSmokePageSchema } from "./smoke-page-schema.mjs";
import {
  assertIndexableStorefrontPage,
  assertNotFoundPage,
  assertRobots,
  assertSitemap,
  assertStorefrontPage,
  getStorefrontPath,
  joinUrl,
} from "./storefront-smoke.mjs";

export {
  getStorefrontPath,
  hasNoIndexRobots,
  joinUrl,
  parseSitemapUrls,
} from "./storefront-smoke.mjs";

const defaultApiUrl = "http://localhost:4000";
const defaultWebUrl = "http://localhost:3000";
const defaultLocale = "en-US";
const defaultMarket = "us";
const defaultEmail = "admin@example.com";
const defaultPassword = "ChangeMe123!";
const defaultTenantSlug = "default";

export async function runSmokeTest(input) {
  const title = `Smoke Publish ${new Date().toISOString()}`;
  const schema = buildSmokePageSchema({
    locale: input.locale,
    market: input.market,
    slug: input.slug,
    title,
  });

  console.log(`Smoke page slug: ${input.slug}`);
  console.log(`API: ${input.apiBaseUrl}`);
  console.log(`Web: ${input.webUrl}`);

  await assertReachable(`${input.apiBaseUrl}/health`, "API health");
  const accessToken = await login(input);
  await assertFeatureFlagsDisabled(input, accessToken);
  const publish = await publishPage(input, accessToken, schema);
  assertPublishedResponse(publish, input, title);
  await assertPublicApi(input, title);
  const storefrontHtml = await assertStorefrontPage(input, title);
  assertIndexableStorefrontPage(storefrontHtml);
  await assertRobots(input);
  await assertSitemap(input);
  await assertNotFoundPage(input);

  console.log("\nSmoke publish passed.");
  console.log(
    `Storefront URL: ${joinUrl(input.webUrl, getStorefrontPath(input.locale, input.slug))}`,
  );
}

export function readConfig() {
  return {
    apiBaseUrl: normalizeApiBaseUrl(readEnv("API_URL", defaultApiUrl)),
    email: readEnv("SMOKE_ADMIN_EMAIL", readEnv("SEED_ADMIN_EMAIL", defaultEmail)),
    locale: readEnv("SMOKE_LOCALE", defaultLocale),
    market: readEnv("SMOKE_MARKET", defaultMarket),
    password: readEnv(
      "SMOKE_ADMIN_PASSWORD",
      readEnv("SEED_ADMIN_PASSWORD", defaultPassword),
    ),
    requireRevalidation: readBooleanEnv("SMOKE_REQUIRE_REVALIDATION", true),
    retryAttempts: readPositiveIntEnv("SMOKE_RETRY_ATTEMPTS", 8),
    retryDelayMs: readPositiveIntEnv("SMOKE_RETRY_DELAY_MS", 1000),
    slug: readEnv("SMOKE_PAGE_SLUG", createSmokeSlug()),
    tenantSlug: readEnv("SMOKE_TENANT_SLUG", defaultTenantSlug),
    webUrl: normalizeOrigin(readEnv("WEB_URL", defaultWebUrl)),
  };
}

async function login(input) {
  const response = await fetchJson(`${input.apiBaseUrl}/auth/login`, {
    body: JSON.stringify({
      email: input.email,
      password: input.password,
      tenantSlug: input.tenantSlug,
    }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(readHttpError(response, "Login request failed."));
  }

  const accessToken = response.body?.data?.accessToken;

  if (typeof accessToken !== "string" || !accessToken) {
    throw new Error("Login succeeded but did not return an access token.");
  }

  console.log("Login passed.");
  return accessToken;
}

async function publishPage(input, accessToken, schema) {
  const response = await fetchJson(
    `${input.apiBaseUrl}/admin/pages/${encodeURIComponent(input.slug)}/publish`,
    {
      body: JSON.stringify(schema),
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "Idempotency-Key": randomUUID(),
      },
      method: "POST",
    },
  );

  if (!response.ok) {
    throw new Error(readHttpError(response, "Publish request failed."));
  }

  console.log("Publish API passed.");
  return response.body;
}

function assertPublishedResponse(response, input, title) {
  const schema = response?.data;

  if (schema?.meta?.slug !== input.slug || schema?.meta?.title !== title) {
    throw new Error("Publish response did not include the expected schema.");
  }

  const revalidation = response?.meta?.revalidation;

  if (input.requireRevalidation && revalidation?.triggered !== true) {
    throw new Error(
      `Storefront revalidation was not triggered (${revalidation?.reason ?? "unknown reason"}).`,
    );
  }

  if (revalidation?.triggered === true) {
    console.log(
      `Storefront revalidation passed: ${revalidation.paths?.join(", ") ?? "paths unavailable"}`,
    );
  } else {
    console.log("Storefront revalidation skipped by configuration.");
  }
}

async function assertPublicApi(input, title) {
  const params = new URLSearchParams({
    locale: input.locale,
    market: input.market,
  });
  const response = await fetchJson(
    `${input.apiBaseUrl}/public/pages/${encodeURIComponent(input.slug)}?${params}`,
  );

  if (!response.ok) {
    throw new Error(readHttpError(response, "Public page API failed."));
  }

  if (response.body?.data?.meta?.title !== title) {
    throw new Error("Public page API did not return the published title.");
  }

  if (response.body?.data?.seo?.noIndex === true) {
    throw new Error("Public page API returned the smoke page as noIndex.");
  }

  console.log("Public page API passed.");
}

async function assertReachable(url, label) {
  const response = await fetchJson(url);

  if (!response.ok) {
    throw new Error(readHttpError(response, `${label} failed.`));
  }

  console.log(`${label} passed.`);
}

async function fetchJson(url, init) {
  const response = await fetch(url, init);
  const text = await response.text();
  const body = text ? parseJson(text, url) : null;

  return {
    body,
    ok: response.ok,
    status: response.status,
    statusText: response.statusText,
    url,
  };
}

function parseJson(text, url) {
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`${url} returned non-JSON content: ${text.slice(0, 160)}`);
  }
}

export function normalizeApiBaseUrl(value) {
  const origin = normalizeOrigin(value);

  if (origin.endsWith("/api/v1")) {
    return origin;
  }

  return `${origin}/api/v1`;
}

function normalizeOrigin(value) {
  return value.trim().replace(/\/+$/, "");
}

function createSmokeSlug() {
  return `smoke-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function readEnv(name, fallback) {
  const value = process.env[name]?.trim();
  return value ? value : fallback;
}

function readBooleanEnv(name, fallback) {
  const value = process.env[name]?.trim().toLowerCase();

  if (!value) {
    return fallback;
  }

  return ["1", "true", "yes", "on"].includes(value);
}

function readPositiveIntEnv(name, fallback) {
  const value = Number(process.env[name]);

  if (Number.isInteger(value) && value > 0) {
    return value;
  }

  return fallback;
}

function readHttpError(response, fallback) {
  const message =
    response.body?.error?.message ??
    response.body?.message ??
    response.statusText ??
    fallback;

  return `${fallback} ${response.status}: ${message}`;
}

export function readErrorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

export function printHelp() {
  console.log(`Usage: pnpm smoke:publish

Publishes a unique smoke-test page through the Admin API, then verifies the
public page API, storefront HTML, robots.txt, sitemap.xml, 404 behavior, and
MVP disabled feature flags.

Environment:
  API_URL                         API origin or /api/v1 base. Default: ${defaultApiUrl}
  WEB_URL                         Storefront origin. Default: ${defaultWebUrl}
  SMOKE_ADMIN_EMAIL               Admin email. Default: SEED_ADMIN_EMAIL or ${defaultEmail}
  SMOKE_ADMIN_PASSWORD            Admin password. Default: SEED_ADMIN_PASSWORD or ${defaultPassword}
  SMOKE_TENANT_SLUG               Tenant slug. Default: ${defaultTenantSlug}
  SMOKE_PAGE_SLUG                 Optional fixed page slug.
  SMOKE_REQUIRE_REVALIDATION      Require meta.revalidation.triggered. Default: true
  SMOKE_RETRY_ATTEMPTS            Storefront fetch attempts. Default: 8
  SMOKE_RETRY_DELAY_MS            Delay between attempts. Default: 1000
`);
}
