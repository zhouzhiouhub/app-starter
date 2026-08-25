import assert from "node:assert/strict";
import test from "node:test";
import { formatSmokeReportSummary } from "./smoke-report-cli.mjs";

test("smoke report CLI suggests fixes for storefront diagnostics", () => {
  const lines = formatSmokeReportSummary({
    schemaVersion: "smoke-report.v3",
    summary: {
      blockerCount: 0,
      checkCount: 3,
      failedCheckCount: 1,
      failedCheckDetails: [
        {
          details: {
            storefront: {
              diagnosis: "stale-or-fallback-content",
              status: 200,
            },
          },
          message:
            "Storefront page did not show published title token=payload.signature",
          name: "storefront.page",
        },
      ],
      failedChecks: ["storefront.page"],
      passedCheckCount: 2,
      productionReady: true,
      status: "failed",
      warningCount: 0,
    },
  });

  assert.equal(
    lines.includes(
      "    - storefront.page: Storefront page did not show published title token=[redacted] (diagnosis: stale-or-fallback-content)",
    ),
    true,
  );
  assert.equal(
    lines.includes(
      "    - Check publish revalidation, ISR cache freshness, and storefront host routing.",
    ),
    true,
  );
});

test("smoke report CLI suggests fixes for storefront SEO diagnostics", () => {
  const lines = formatSmokeReportSummary({
    schemaVersion: "smoke-report.v3",
    summary: {
      blockerCount: 0,
      checkCount: 3,
      failedCheckCount: 1,
      failedCheckDetails: [
        {
          details: {
            notFound: {
              noIndex: false,
              status: 200,
            },
            robots: {
              hasHostLine: false,
              hasSitemapLine: false,
              hasUserAgent: false,
              pointsToHost: false,
              pointsToSitemap: false,
            },
            sitemap: {
              expectedUrlPresent: false,
              notFoundUrlPresent: true,
              offOriginUrlCount: 1,
            },
            storefrontSeo: {
              diagnosis: "canonical-mismatch",
            },
          },
          message: "Storefront SEO metadata mismatch.",
          name: "storefront.seo",
        },
      ],
      failedChecks: ["storefront.seo"],
      passedCheckCount: 2,
      productionReady: true,
      status: "failed",
      warningCount: 0,
    },
  });

  assert.equal(
    lines.includes(
      "    - storefront.seo: Storefront SEO metadata mismatch. (diagnosis: canonical-mismatch)",
    ),
    true,
  );
  assert.equal(
    lines.includes(
      "    - Check SMOKE_STOREFRONT_HOST / WEB_URL and storefront canonical/Open Graph URL metadata generation.",
    ),
    true,
  );
  assert.equal(
    lines.includes(
      "    - Check robots.txt generation includes User-agent and Host lines.",
    ),
    true,
  );
  assert.equal(
    lines.includes("    - Check robots.txt Host uses the expected storefront origin."),
    true,
  );
  assert.equal(
    lines.includes(
      "    - Check robots.txt Sitemap points to the storefront sitemap URL.",
    ),
    true,
  );
  assert.equal(
    lines.includes(
      "    - Check sitemap generation includes the published smoke page URL after publish/revalidation.",
    ),
    true,
  );
  assert.equal(
    lines.includes("    - Exclude the 404 system page from sitemap output."),
    true,
  );
  assert.equal(
    lines.includes(
      "    - Ensure sitemap URLs use the expected storefront origin only.",
    ),
    true,
  );
  assert.equal(
    lines.includes("    - Ensure unknown storefront routes return HTTP 404."),
    true,
  );
  assert.equal(
    lines.includes(
      "    - Ensure the storefront 404 page renders noindex robots metadata.",
    ),
    true,
  );
});

test("smoke report CLI suggests fixes for storefront redirects", () => {
  const lines = formatSmokeReportSummary({
    schemaVersion: "smoke-report.v3",
    summary: {
      blockerCount: 0,
      checkCount: 1,
      failedCheckCount: 1,
      failedCheckDetails: [
        {
          details: {
            storefront: {
              diagnosis: "redirect-response",
              redirectLocation: "https://web.example.com/login?token=[redacted]",
              status: 302,
            },
          },
          message: "Storefront page redirected to token=payload.signature.",
          name: "storefront.page",
        },
      ],
      failedChecks: ["storefront.page"],
      passedCheckCount: 0,
      productionReady: true,
      status: "failed",
      warningCount: 0,
    },
  });

  assert.equal(
    lines.includes(
      "    - storefront.page: Storefront page redirected to token=[redacted] (diagnosis: redirect-response)",
    ),
    true,
  );
  assert.equal(
    lines.includes(
      "    - Check WEB_URL, storefront host routing, and hosting rewrites so published page smoke does not receive a redirect.",
    ),
    true,
  );
});

test("smoke report CLI suggests fixes for Web revalidation execution failures", () => {
  const lines = formatSmokeReportSummary({
    schemaVersion: "smoke-report.v3",
    summary: {
      blockerCount: 0,
      checkCount: 1,
      failedCheckCount: 1,
      failedCheckDetails: [
        {
          details: {
            revalidation: {
              diagnosis: "web-revalidation-failed",
              status: 500,
            },
          },
          message: "Storefront revalidation failed.",
          name: "page.publish",
        },
      ],
      failedChecks: ["page.publish"],
      passedCheckCount: 0,
      productionReady: true,
      status: "failed",
      warningCount: 0,
    },
  });

  assert.equal(
    lines.includes(
      "    - page.publish: Storefront revalidation failed. (diagnosis: web-revalidation-failed)",
    ),
    true,
  );
  assert.equal(
    lines.includes(
      "    - Check the Web /api/revalidate route logs for failed cache tag or path refresh operations.",
    ),
    true,
  );
});

test("smoke report CLI suggests fixes for revalidation redirects", () => {
  const lines = formatSmokeReportSummary({
    schemaVersion: "smoke-report.v3",
    summary: {
      blockerCount: 0,
      checkCount: 1,
      failedCheckCount: 1,
      failedCheckDetails: [
        {
          details: {
            revalidation: {
              diagnosis: "revalidation-redirect",
              status: 302,
            },
          },
          message: "Storefront revalidation was redirected.",
          name: "page.publish",
        },
      ],
      failedChecks: ["page.publish"],
      passedCheckCount: 0,
      productionReady: true,
      status: "failed",
      warningCount: 0,
    },
  });

  assert.equal(
    lines.includes(
      "    - page.publish: Storefront revalidation was redirected. (diagnosis: revalidation-redirect)",
    ),
    true,
  );
  assert.equal(
    lines.includes(
      "    - Check STOREFRONT_REVALIDATE_URL and hosting rewrites so /api/revalidate responds directly instead of redirecting.",
    ),
    true,
  );
});
