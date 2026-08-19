import { randomUUID } from "node:crypto";
import { assertAuditLogs } from "./audit-smoke.mjs";
import { assertFeatureFlagsDisabled } from "./feature-flags-smoke.mjs";
import { assertMediaUploadTarget } from "./media-smoke.mjs";
import { assertPreviewFlow } from "./preview-smoke.mjs";
import {
  assertPublicApi,
  assertPublicFallbackApi,
} from "./public-api-smoke.mjs";
import { assertRollbackFlow } from "./rollback-smoke.mjs";
import { buildSmokePageSchema } from "./smoke-page-schema.mjs";
import {
  completeSmokeReport,
  createSmokeReport,
  failSmokeReport,
  recordSmokeCheck,
  recordSmokeCheckFailure,
  writeSmokeReportIfConfigured,
} from "./smoke-report.mjs";
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
  const report = createSmokeReport(input, title);
  const schema = buildSmokePageSchema({
    locale: input.locale,
    market: input.market,
    slug: input.slug,
    title,
  });

  console.log(`Smoke page slug: ${input.slug}`);
  console.log(`API: ${input.apiBaseUrl}`);
  console.log(`Web: ${input.webUrl}`);

  try {
    await runSmokeStep(report, "api.health", () =>
      assertReachable(`${input.apiBaseUrl}/health`, "API health"),
    );
    const accessToken = await runSmokeStep(report, "auth.login", () =>
      login(input),
    );
    await runSmokeStep(report, "feature-flags.disabled", () =>
      assertFeatureFlagsDisabled(input, accessToken),
    );
    await runSmokeStep(
      report,
      "media.upload-target",
      () => assertMediaUploadTarget(input, accessToken),
      (details) => details,
    );
    const page = await runSmokeStep(
      report,
      "page.preview",
      () => assertPreviewFlow(input, accessToken, schema, title),
      (result) => ({ pageId: result.id }),
    );
    await runSmokeStep(
      report,
      "page.publish",
      async () => {
        const publish = await publishPage(input, accessToken, page.id, schema);
        assertPublishedResponse(publish, input, title);
        return publish;
      },
      (publish) => ({ revalidation: publish?.meta?.revalidation ?? null }),
    );
    await runSmokeStep(
      report,
      "page.rollback",
      () =>
        assertRollbackFlow(input, accessToken, {
          pageId: page.id,
          title,
        }),
      (rollback) => rollback,
    );
    await runSmokeStep(
      report,
      "audit.logs",
      async () => {
        const actions = [
          "preview_token.created",
          "page.published",
          "page.rolled_back",
        ];
        await assertAuditLogs(input, accessToken, page.id, actions);
        return { actions };
      },
      (details) => details,
    );
    await runSmokeStep(report, "public-page.api", () =>
      assertPublicApi(input, title),
    );
    await runSmokeStep(
      report,
      "public-page.fallback-api",
      () => assertPublicFallbackApi(input, title),
      (details) => details,
    );
    await runSmokeStep(report, "storefront.page", async () => {
      const storefrontHtml = await assertStorefrontPage(input, title);
      assertIndexableStorefrontPage(storefrontHtml);
    });
    await runSmokeStep(report, "seo.robots", () => assertRobots(input));
    await runSmokeStep(report, "seo.sitemap", () => assertSitemap(input));
    await runSmokeStep(report, "seo.not-found", () =>
      assertNotFoundPage(input),
    );

    const storefrontUrl = joinUrl(
      input.webUrl,
      getStorefrontPath(input.locale, input.slug),
    );
    completeSmokeReport(report, { pageId: page.id, storefrontUrl });
    await writeSmokeReportIfConfigured(input, report);
    console.log("\nSmoke publish passed.");
    console.log(`Storefront URL: ${storefrontUrl}`);
  } catch (error) {
    failSmokeReport(report, error);
    await writeFailureReport(input, report);
    throw error;
  }
}

async function runSmokeStep(
  report,
  name,
  action,
  readDetails = () => ({}),
) {
  try {
    const result = await action();
    recordSmokeCheck(report, name, readDetails(result));
    return result;
  } catch (error) {
    recordSmokeCheckFailure(report, name, error);
    throw error;
  }
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
    requireR2Upload: readBooleanEnv("SMOKE_REQUIRE_R2_UPLOAD", false),
    requireRevalidation: readBooleanEnv("SMOKE_REQUIRE_REVALIDATION", true),
    retryAttempts: readPositiveIntEnv("SMOKE_RETRY_ATTEMPTS", 8),
    retryDelayMs: readPositiveIntEnv("SMOKE_RETRY_DELAY_MS", 1000),
    reportPath: readOptionalEnv("SMOKE_REPORT_PATH"),
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

async function publishPage(input, accessToken, pageId, schema) {
  const response = await fetchJson(
    `${input.apiBaseUrl}/pages/${encodeURIComponent(pageId)}/publish`,
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

function readOptionalEnv(name) {
  const value = process.env[name]?.trim();
  return value ? value : null;
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

async function writeFailureReport(input, report) {
  try {
    await writeSmokeReportIfConfigured(input, report);
  } catch (error) {
    console.error(`Smoke report could not be written: ${readErrorMessage(error)}`);
  }
}

export function readErrorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

export function printHelp() {
  console.log(`Usage: pnpm smoke:publish

Publishes a unique smoke-test page through the Admin API, then verifies the
page editor draft save, Preview Token, public preview API, Web preview page,
publish API, rollback API, audit logs, public page API, media upload target,
media list filters, storefront HTML, robots.txt, sitemap.xml, 404 behavior, and MVP disabled feature flags.

Environment:
  API_URL                         API origin or /api/v1 base. Default: ${defaultApiUrl}
  WEB_URL                         Storefront origin. Default: ${defaultWebUrl}
  SMOKE_ADMIN_EMAIL               Admin email. Default: SEED_ADMIN_EMAIL or ${defaultEmail}
  SMOKE_ADMIN_PASSWORD            Admin password. Default: SEED_ADMIN_PASSWORD or ${defaultPassword}
  SMOKE_TENANT_SLUG               Tenant slug. Default: ${defaultTenantSlug}
  SMOKE_PAGE_SLUG                 Optional fixed page slug.
  SMOKE_REQUIRE_R2_UPLOAD         Require R2 presigned URL, actual PUT upload, and production CDN URL. Default: false
  SMOKE_REQUIRE_REVALIDATION      Require meta.revalidation.triggered. Default: true
  SMOKE_RETRY_ATTEMPTS            Storefront fetch attempts. Default: 8
  SMOKE_RETRY_DELAY_MS            Delay between attempts. Default: 1000
  SMOKE_REPORT_PATH               Optional JSON report output path.
`);
}
