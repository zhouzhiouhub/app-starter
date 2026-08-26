import assert from "node:assert/strict";
import test from "node:test";
import {
  assertRevalidationSmokeTargets,
  createRevalidationSmokeDetails,
} from "./revalidation-smoke.mjs";

test("smoke helpers summarize revalidation results for reports", () => {
  assert.deepEqual(
    createRevalidationSmokeDetails(
      {
        paths: ["/", "/en"],
        tags: ["published-page"],
        triggered: true,
      },
      { requireRevalidation: true },
    ),
    {
      diagnosis: "triggered",
      pathCount: 2,
      paths: ["/", "/en"],
      reason: null,
      required: true,
      status: null,
      tagCount: 1,
      tags: ["published-page"],
      triggered: true,
    },
  );

  assert.deepEqual(
    createRevalidationSmokeDetails(
      {
        paths: ["/en/contact"],
        reason: "request-timeout",
        tags: [],
        triggered: false,
      },
      { requireRevalidation: true },
    ),
    {
      diagnosis: "request-timeout",
      pathCount: 1,
      paths: ["/en/contact"],
      reason: "request-timeout",
      required: true,
      status: null,
      tagCount: 0,
      tags: [],
      triggered: false,
    },
  );
});

test("smoke helpers classify revalidation HTTP failures", () => {
  assert.equal(
    createRevalidationSmokeDetails(
      {
        paths: ["/en/contact"],
        reason: "request-failed",
        status: 302,
        tags: [],
        triggered: false,
      },
      { requireRevalidation: true },
    ).diagnosis,
    "revalidation-redirect",
  );
  assert.equal(
    createRevalidationSmokeDetails(
      {
        paths: ["/en/contact"],
        reason: "request-failed",
        status: 400,
        tags: [],
        triggered: false,
      },
      { requireRevalidation: true },
    ).diagnosis,
    "invalid-revalidation-payload",
  );
  assert.equal(
    createRevalidationSmokeDetails(
      {
        paths: ["/en/contact"],
        reason: "request-failed",
        status: 401,
        tags: [],
        triggered: false,
      },
      { requireRevalidation: true },
    ).diagnosis,
    "revalidation-secret-mismatch",
  );
  assert.equal(
    createRevalidationSmokeDetails(
      {
        paths: ["/en/contact"],
        reason: "request-failed",
        status: 404,
        tags: [],
        triggered: false,
      },
      { requireRevalidation: true },
    ).diagnosis,
    "revalidate-route-missing",
  );
  assert.equal(
    createRevalidationSmokeDetails(
      {
        paths: ["/en/contact"],
        reason: "request-failed",
        status: 503,
        tags: [],
        triggered: false,
      },
      { requireRevalidation: true },
    ).diagnosis,
    "web-revalidation-not-configured",
  );
  assert.equal(
    createRevalidationSmokeDetails(
      {
        paths: ["/en/contact"],
        reason: "request-failed",
        status: 500,
        tags: [],
        triggered: false,
      },
      { requireRevalidation: true },
    ).diagnosis,
    "web-revalidation-failed",
  );
});

test("smoke helpers bound revalidation diagnostic fields", () => {
  const longPath = `/en/contact?token=payload.signature&next=${"x".repeat(
    500,
  )}\nAuthorization Bearer a.b.c`;
  const longTag = `published-page:us:en-US:contact:${"y".repeat(
    500,
  )}\ntoken=payload.signature`;
  const details = createRevalidationSmokeDetails(
    {
      paths: Array.from({ length: 30 }, () => longPath),
      reason: `request-failed\nAuthorization Bearer a.b.c ${"z".repeat(500)}`,
      tags: Array.from({ length: 30 }, () => longTag),
      triggered: false,
    },
    { requireRevalidation: true },
  );

  assert.equal(details.pathCount, 30);
  assert.equal(details.tagCount, 30);
  assert.equal(details.paths.length <= 20, true);
  assert.equal(details.tags.length <= 20, true);
  assert.equal(details.reason.includes("a.b.c"), false);
  assert.doesNotMatch(details.reason, /[\r\n]/);
  assert.match(details.reason, /\.\.\.$/);
  assert.equal(details.reason.length <= 160, true);
  for (const value of [...details.paths, ...details.tags]) {
    assert.equal(value.includes("payload.signature"), false);
    assert.equal(value.includes("a.b.c"), false);
    assert.doesNotMatch(value, /[\r\n]/);
    assert.match(value, /\.\.\.$/);
    assert.equal(value.length <= 160, true);
  }
});

test("smoke helpers reject revalidation results missing expected targets", () => {
  let error;

  try {
    assertRevalidationSmokeTargets(
      {
        paths: ["/de/other"],
        tags: [
          "published-page",
          "published-page:eu:de-DE",
          "public-translation",
        ],
        triggered: true,
      },
      {
        fallbackLocale: "en-US",
        fallbackMarket: "us",
        locale: "de-DE",
        market: "eu",
        requireRevalidation: true,
        slug: "contact",
      },
    );
  } catch (caught) {
    error = caught;
  }

  assert.ok(error);
  assert.match(
    error.message,
    /missing paths: \/de\/contact, missing tags: published-page:eu:de-DE:contact, published-page:us:en-US, published-page:us:en-US:contact, public-translation:de-DE, public-translation:en-US/,
  );
  assert.equal(error.smokeDetails.revalidation.diagnosis, "triggered");
  assert.deepEqual(error.smokeDetails.revalidation.missingPaths, [
    "/de/contact",
  ]);
  assert.deepEqual(error.smokeDetails.revalidation.missingTags, [
    "published-page:eu:de-DE:contact",
    "published-page:us:en-US",
    "published-page:us:en-US:contact",
    "public-translation:de-DE",
    "public-translation:en-US",
  ]);
});
