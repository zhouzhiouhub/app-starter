import assert from "node:assert/strict";
import test from "node:test";
import {
  assertPublishedResponse,
  formatPublishRevalidationFailure,
} from "./publish-page-smoke.mjs";

test("publish page smoke helpers format revalidation failures with diagnostics", () => {
  assert.equal(
    formatPublishRevalidationFailure(
      {
        paths: ["/en/contact"],
        reason: "request-failed",
        status: 401,
        tags: ["published-page"],
        triggered: false,
      },
      { requireRevalidation: true },
    ),
    [
      "Storefront revalidation was not triggered",
      "(diagnosis: revalidation-secret-mismatch,",
      "reason: request-failed,",
      "status: 401,",
      "paths: 1,",
      "tags: 1).",
    ].join(" "),
  );
});

test("publish page smoke accepts revalidation targets for the published page", () => {
  assert.doesNotThrow(() =>
    assertPublishedResponse(
      {
        data: {
          meta: {
            slug: "contact",
            title: "Contact",
          },
        },
        meta: {
          revalidation: {
            paths: ["/en/contact"],
            tags: [
              "published-page",
              "published-page:us:en-US",
              "published-page:us:en-US:contact",
            ],
            triggered: true,
          },
        },
      },
      {
        locale: "en-US",
        market: "us",
        requireRevalidation: true,
        slug: "contact",
      },
      "Contact",
    ),
  );
});

test("publish page smoke rejects revalidation without page path and tags", () => {
  assert.throws(
    () =>
      assertPublishedResponse(
        {
          data: {
            meta: {
              slug: "contact",
              title: "Contact",
            },
          },
          meta: {
            revalidation: {
              paths: ["/en/other"],
              tags: ["published-page"],
              triggered: true,
            },
          },
        },
        {
          locale: "en-US",
          market: "us",
          requireRevalidation: true,
          slug: "contact",
        },
        "Contact",
      ),
    /missing paths: \/en\/contact, missing tags: published-page:us:en-US, published-page:us:en-US:contact/,
  );
});
