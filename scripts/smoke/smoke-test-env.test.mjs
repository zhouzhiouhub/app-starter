import assert from "node:assert/strict";
import test from "node:test";
import { withEnv } from "./smoke-test-env.mjs";

test("withEnv isolates smoke config variables from ambient process env", async () => {
  const previous = process.env.APP_ENV;
  process.env.APP_ENV = "production";

  try {
    await withEnv({ API_URL: "https://api.example.com" }, async () => {
      assert.equal(process.env.API_URL, "https://api.example.com");
      assert.equal(process.env.APP_ENV, undefined);
    });

    assert.equal(process.env.APP_ENV, "production");
  } finally {
    if (previous === undefined) {
      delete process.env.APP_ENV;
    } else {
      process.env.APP_ENV = previous;
    }
  }
});

test("withEnv restores isolated smoke variables after failures", async () => {
  const previous = process.env.SMOKE_PAGE_SLUG;
  process.env.SMOKE_PAGE_SLUG = "ambient";

  try {
    await assert.rejects(
      withEnv({ SMOKE_PAGE_SLUG: "inside" }, async () => {
        assert.equal(process.env.SMOKE_PAGE_SLUG, "inside");
        throw new Error("boom");
      }),
      /boom/,
    );

    assert.equal(process.env.SMOKE_PAGE_SLUG, "ambient");
  } finally {
    if (previous === undefined) {
      delete process.env.SMOKE_PAGE_SLUG;
    } else {
      process.env.SMOKE_PAGE_SLUG = previous;
    }
  }
});
