import assert from "node:assert/strict";
import test from "node:test";
import { buildPublicationFeedback } from "../src/features/pages/revalidation-feedback.ts";

test("publication feedback summarizes triggered storefront revalidation", () => {
  const message = buildPublicationFeedback({
    action: "publish",
    revalidation: {
      paths: ["/", "/en"],
      tags: ["published-page"],
      triggered: true,
    },
    slug: "home",
  });

  assert.match(message, /^Published\./);
  assert.match(message, /Storefront revalidation triggered for 2 paths\./);
});

test("publication feedback explains missing revalidation configuration", () => {
  assert.match(
    buildPublicationFeedback({
      action: "rollback",
      revalidation: {
        paths: ["/en/contact"],
        reason: "missing-secret",
        tags: [],
        triggered: false,
      },
      slug: "contact",
    }),
    /secret is not configured/,
  );
  assert.match(
    buildPublicationFeedback({
      action: "publish",
      revalidation: {
        paths: ["/en/contact"],
        reason: "missing-url",
        tags: [],
        triggered: false,
      },
      slug: "contact",
    }),
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
    }),
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
    }),
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
    }),
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
    }),
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
    }),
    /STOREFRONT_REVALIDATE_URL or WEB_URL/,
  );
});
