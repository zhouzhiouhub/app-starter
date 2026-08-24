import assert from "node:assert/strict";
import test from "node:test";
import { buildPublicationFeedback } from "../src/features/pages/revalidation-feedback.ts";

test("publication feedback summarizes triggered storefront revalidation", () => {
  const feedback = buildPublicationFeedback({
    action: "publish",
    locale: "en-US",
    revalidation: {
      paths: ["/", "/en"],
      tags: ["published-page"],
      triggered: true,
    },
    siteDomain: "store.brand-platform.com",
    slug: "home",
  });

  assert.equal(feedback.type, "success");
  assert.match(feedback.message, /^Published\./);
  assert.match(
    feedback.message,
    /Storefront revalidation triggered for 2 paths: \/, \/en\./,
  );
  assert.match(feedback.message, /https:\/\/store\.brand-platform\.com\/en/);
});

test("publication feedback keeps successful publish visible when preflight warnings exist", () => {
  const feedback = buildPublicationFeedback({
    action: "publish",
    locale: "en-US",
    preflightWarningSummary:
      "Review 1 non-blocking publish warning: Open Graph image needs review.",
    revalidation: {
      paths: ["/en"],
      tags: ["published-page"],
      triggered: true,
    },
    slug: "home",
  });

  assert.equal(feedback.type, "warning");
  assert.match(feedback.message, /^Published\./);
  assert.match(feedback.message, /Storefront revalidation triggered/);
  assert.match(feedback.message, /Open Graph image needs review/);
});

test("publication feedback uses the published locale in review links", () => {
  const feedback = buildPublicationFeedback({
    action: "publish",
    locale: "de-DE",
    revalidation: {
      paths: ["/de/kampagne"],
      tags: ["published-page"],
      triggered: true,
    },
    siteDomain: "store.brand-platform.com",
    slug: "kampagne",
  });

  assert.match(
    feedback.message,
    /https:\/\/store\.brand-platform\.com\/de\/kampagne/,
  );
  assert.doesNotMatch(feedback.message, /\/en\/kampagne/);
});

test("publication feedback ignores blank preflight warning summaries", () => {
  const feedback = buildPublicationFeedback({
    action: "publish",
    locale: "en-US",
    preflightWarningSummary: "   ",
    revalidation: {
      paths: ["/en"],
      tags: ["published-page"],
      triggered: true,
    },
    slug: "home",
  });

  assert.equal(feedback.type, "success");
});

test("publication feedback preserves success when the review link is unavailable", () => {
  const feedback = buildPublicationFeedback({
    action: "publish",
    locale: "en-US",
    revalidation: {
      paths: ["/en"],
      tags: ["published-page"],
      triggered: true,
    },
    slug: "home",
    storefrontRuntime: {
      configured: "http://localhost:3000",
      fallbackConfigured: "https://store.example.com",
      isProd: true,
      windowLocation: {
        hostname: "admin.brand-platform.com",
        protocol: "https:",
      },
    },
  });

  assert.equal(feedback.type, "warning");
  assert.match(feedback.message, /^Published\./);
  assert.match(feedback.message, /Storefront revalidation triggered/);
  assert.match(feedback.message, /review link is unavailable/);
  assert.doesNotMatch(feedback.message, /admin\.brand-platform\.com:3000/);
});

test("publication feedback explains missing revalidation configuration", () => {
  const missingSecret = buildPublicationFeedback({
    action: "rollback",
    locale: "en-US",
    revalidation: {
      paths: ["/en/contact"],
      reason: "missing-secret",
      tags: [],
      triggered: false,
    },
    slug: "contact",
  });
  const missingUrl = buildPublicationFeedback({
    action: "publish",
    locale: "en-US",
    revalidation: {
      paths: ["/en/contact"],
      reason: "missing-url",
      tags: [],
      triggered: false,
    },
    slug: "contact",
  });

  assert.equal(missingSecret.type, "warning");
  assert.match(missingSecret.message, /secret is not configured/);
  assert.equal(missingUrl.type, "warning");
  assert.match(missingUrl.message, /URL is not configured/);
});

test("publication feedback explains invalid site host revalidation skips", () => {
  const feedback = buildPublicationFeedback({
    action: "publish",
    locale: "en-US",
    revalidation: {
      paths: ["/en/contact"],
      reason: "invalid-site-host",
      tags: [],
      triggered: false,
    },
    slug: "contact",
  });

  assert.equal(feedback.type, "warning");
  assert.match(feedback.message, /site domain is invalid/);
  assert.match(feedback.message, /Check affected paths: \/en\/contact/);
});

test("publication feedback distinguishes HTTP failures from timeout style failures", () => {
  assert.match(
    buildPublicationFeedback({
      action: "publish",
      locale: "en-US",
      revalidation: {
        paths: ["/en/contact"],
        reason: "request-failed",
        status: 503,
        tags: [],
        triggered: false,
      },
      slug: "contact",
    }).message,
    /not configured on Web with HTTP 503.*STOREFRONT_REVALIDATE_SECRET/,
  );
  assert.match(
    buildPublicationFeedback({
      action: "publish",
      locale: "en-US",
      revalidation: {
        paths: ["/en/contact"],
        reason: "request-timeout",
        tags: [],
        triggered: false,
      },
      slug: "contact",
    }).message,
    /timed out.*STOREFRONT_REVALIDATE_TIMEOUT_MS/,
  );
});

test("publication feedback explains actionable revalidation HTTP statuses", () => {
  assert.match(
    buildPublicationFeedback({
      action: "publish",
      locale: "en-US",
      revalidation: {
        paths: ["/en/contact"],
        reason: "request-failed",
        status: 400,
        tags: [],
        triggered: false,
      },
      slug: "contact",
    }).message,
    /page slug, locale, and market/,
  );
  assert.match(
    buildPublicationFeedback({
      action: "publish",
      locale: "en-US",
      revalidation: {
        paths: ["/en/contact"],
        reason: "request-failed",
        status: 401,
        tags: [],
        triggered: false,
      },
      slug: "contact",
    }).message,
    /same STOREFRONT_REVALIDATE_SECRET/,
  );
  assert.match(
    buildPublicationFeedback({
      action: "publish",
      locale: "en-US",
      revalidation: {
        paths: ["/en/contact"],
        reason: "request-failed",
        status: 404,
        tags: [],
        triggered: false,
      },
      slug: "contact",
    }).message,
    /STOREFRONT_REVALIDATE_URL or WEB_URL/,
  );
});

test("publication feedback marks failed revalidation as warning with affected paths", () => {
  const feedback = buildPublicationFeedback({
    action: "publish",
    locale: "en-US",
    revalidation: {
      paths: ["/en/contact", "/en/support", "/en/about", "/en/legal"],
      reason: "request-failed",
      tags: ["published-page"],
      triggered: false,
    },
    slug: "contact",
  });

  assert.equal(feedback.type, "warning");
  assert.match(
    feedback.message,
    /Check affected paths: \/en\/contact, \/en\/support, \/en\/about, and 1 more\./,
  );
});

test("publication feedback redacts sensitive affected path details", () => {
  const feedback = buildPublicationFeedback({
    action: "publish",
    locale: "en-US",
    revalidation: {
      paths: [
        "/preview?preview_token=secret-token",
        `/en/${"long-path-segment-".repeat(12)}?signature=signed-value`,
      ],
      reason: "request-failed",
      tags: ["published-page"],
      triggered: false,
    },
    slug: "home",
  });

  assert.equal(feedback.message.includes("secret-token"), false);
  assert.equal(feedback.message.includes("signed-value"), false);
  assert.match(feedback.message, /preview_token=\[redacted\]/);
  assert.match(feedback.message, /\.\.\./);
  assert.equal(feedback.message.length < 500, true);
});
