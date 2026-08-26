import { assertAuditLogs } from "./audit-smoke.mjs";
import { assertAdminApp } from "./admin-app-smoke.mjs";
import { loginSmokeAdmin } from "./auth-smoke.mjs";
import { assertFeatureFlagsDisabled } from "./feature-flags-smoke.mjs";
import { assertJsonReachable } from "./http-json-smoke.mjs";
import { assertMediaUploadTarget } from "./media-smoke.mjs";
import { assertPublishedResponse, publishPage } from "./publish-page-smoke.mjs";
import { runSmokeStep } from "./publish-smoke-step.mjs";
import { assertPreviewFlow } from "./preview-smoke.mjs";
import {
  assertPublicApi,
  assertPublicFallbackApi,
} from "./public-api-smoke.mjs";
import { assertRollbackFlow } from "./rollback-smoke.mjs";
import { createRevalidationSmokeDetails } from "./revalidation-smoke.mjs";
import { buildSmokePageSchema } from "./smoke-page-schema.mjs";
import { printSmokeProductionReadiness } from "./smoke-readiness-cli.mjs";
import {
  completeSmokeReport,
  createSmokeReport,
  failSmokeReport,
  recordSmokeStorefrontUrls,
  writeSmokeReportIfConfigured,
} from "./smoke-report.mjs";
import { printSmokeReportSummary } from "./smoke-report-cli.mjs";
import { readErrorMessage } from "./smoke-error-message.mjs";
import { formatSmokeText } from "./smoke-text.mjs";
import {
  assertIndexableStorefrontPage,
  assertNotFoundPage,
  assertRobots,
  assertSitemap,
  assertStorefrontPage,
  getExpectedStorefrontOrigin,
  getStorefrontPath,
  joinUrl,
} from "./storefront-smoke.mjs";

export {
  getExpectedStorefrontOrigin,
  getStorefrontPath,
  hasNoIndexRobots,
  joinUrl,
  parseSitemapUrls,
} from "./storefront-smoke.mjs";
export { formatPublishRevalidationFailure } from "./publish-page-smoke.mjs";
export { readErrorMessage } from "./smoke-error-message.mjs";
export {
  normalizeAdminOrigin,
  normalizeApiBaseUrl,
  normalizeSmokeBoolean,
  normalizeSmokeLocale,
  normalizeSmokeMarket,
  normalizeSmokePositiveInt,
  normalizeSmokeReportPath,
  normalizeSmokeSlug,
  normalizeStorefrontHost,
  normalizeWebOrigin,
  printHelp,
  readConfig,
} from "./publish-smoke-config.mjs";

const maxSmokeReportPageIdLength = 160;

export async function runSmokeTest(input) {
  const title = `Smoke Publish ${new Date().toISOString()}`;
  const report = createSmokeReport(input, title);
  const storefrontUrls = createSmokeStorefrontUrls(input);
  const schema = buildSmokePageSchema({
    locale: input.locale,
    market: input.market,
    slug: input.slug,
    title,
  });
  recordSmokeStorefrontUrls(report, storefrontUrls);

  console.log(`Smoke page slug: ${input.slug}`);
  console.log(`API: ${input.apiBaseUrl}`);
  console.log(`Web: ${input.webUrl}`);
  console.log(`Storefront host: ${input.storefrontHost ?? "(from WEB_URL)"}`);
  console.log(`Admin: ${input.adminUrl ?? "(not required)"}`);

  try {
    await runSmokeStep(report, "api.health", () =>
      assertJsonReachable(`${input.apiBaseUrl}/health`, "API health"),
    );
    if (input.requireAdminApp) {
      await runSmokeStep(
        report,
        "admin.app",
        () => assertAdminApp(input),
        (details) => details,
      );
    }
    const accessToken = await runSmokeStep(report, "auth.login", () =>
      loginSmokeAdmin(input),
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
      (result) => ({ pageId: formatSmokeReportPageId(result.id) }),
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
      assertIndexableStorefrontPage(storefrontHtml, input);
    });
    await runSmokeStep(report, "seo.robots", () => assertRobots(input));
    await runSmokeStep(report, "seo.sitemap", () => assertSitemap(input));
    await runSmokeStep(report, "seo.not-found", () =>
      assertNotFoundPage(input),
    );

    completeSmokeReport(report, {
      pageId: formatSmokeReportPageId(page.id),
      ...storefrontUrls,
    });
    await writeSmokeReportIfConfigured(input, report);
    console.log("\nSmoke publish passed.");
    printSmokeReportSummary(report);
    printSmokeProductionReadiness(report.productionReadiness);
    console.log(`Storefront URL: ${storefrontUrls.storefrontUrl}`);
    if (storefrontUrls.storefrontRequestUrl !== storefrontUrls.storefrontUrl) {
      console.log(
        `Storefront request URL: ${storefrontUrls.storefrontRequestUrl}`,
      );
    }
  } catch (error) {
    failSmokeReport(report, error);
    await writeFailureReport(input, report);
    printSmokeReportSummary(report);
    throw error;
  }
}

export function createSmokeStorefrontUrls(input) {
  const path = getStorefrontPath(input.locale, input.slug);

  return {
    storefrontRequestUrl: joinUrl(input.webUrl, path),
    storefrontUrl: joinUrl(getExpectedStorefrontOrigin(input), path),
  };
}

export function formatSmokeReportPageId(pageId) {
  return formatSmokeText(pageId, {
    fallback: "unknown",
    maxLength: maxSmokeReportPageIdLength,
  });
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
