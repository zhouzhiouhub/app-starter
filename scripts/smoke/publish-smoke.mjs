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
import { createRevalidationSmokeDetails } from "./revalidation-smoke.mjs";
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
export {
  normalizeApiBaseUrl,
  normalizeSmokeBoolean,
  normalizeSmokeLocale,
  normalizeSmokeMarket,
  normalizeSmokeSlug,
  normalizeWebOrigin,
  printHelp,
  readConfig,
} from "./publish-smoke-config.mjs";

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
      (publish) => ({
        revalidation: createRevalidationSmokeDetails(
          publish?.meta?.revalidation,
          input,
        ),
      }),
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

async function runSmokeStep(report, name, action, readDetails = () => ({})) {
  try {
    const result = await action();
    recordSmokeCheck(report, name, readDetails(result));
    return result;
  } catch (error) {
    recordSmokeCheckFailure(report, name, error);
    throw error;
  }
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
    console.error(
      `Smoke report could not be written: ${readErrorMessage(error)}`,
    );
  }
}

export function readErrorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}
