import assert from "node:assert/strict";
import test from "node:test";
import { buildPublicationFeedback } from "../src/features/pages/revalidation-feedback.ts";

test("publication feedback summarizes triggered storefront revalidation", () => {
  const feedback = buildPublicationFeedback({
    action: "publish",
    revalidation: {
      paths: ["/", "/en"],
      tags: ["published-page"],
      triggered: true,
    },
    slug: "home",
  });

  assert.equal(feedback.type, "success");
  assert.match(feedback.message, /^Published\./);
  assert.match(
    feedback.message,
    /Storefront revalidation triggered for 2 paths: \/, \/en\./,
  );
});

test("publication feedback explains missing revalidation configuration", () => {
  const missingSecret = buildPublicationFeedback({
    action: "rollback",
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
    revalidation: {
      paths: ["/en/contact"],
      reason: "missing-url",
      tags: [],
      triggered: false,
    },
    slug: "contact",
  });

  assert.equal(missingSecret.type, "warning");
  assert.match(
    missingSecret.message,
    /secret is not configured/,
  );
  assert.equal(missingUrl.type, "warning");
  assert.match(
    missingUrl.message,
    /URL is not configured/,
  );
});

test("publication feedback distinguishes HTTP failures from timeout style failures", () => {
  assert.match(
    buildPublicationFeedback({
      action: "publish",
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
