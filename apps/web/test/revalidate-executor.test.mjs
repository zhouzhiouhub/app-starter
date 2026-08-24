import assert from "node:assert/strict";
import test from "node:test";
import { runRevalidationOperations } from "../src/lib/revalidate-executor.ts";

test("revalidate executor refreshes tags before paths", () => {
  const calls = [];

  const result = runRevalidationOperations({
    paths: ["/en/contact", "/en/about"],
    revalidatePath: (path) => calls.push(`path:${path}`),
    revalidateTag: (tag) => calls.push(`tag:${tag}`),
    tags: ["published-page", "published-page:us:en-US"],
  });

  assert.deepEqual(result, { ok: true });
  assert.deepEqual(calls, [
    "tag:published-page",
    "tag:published-page:us:en-US",
    "path:/en/contact",
    "path:/en/about",
  ]);
});

test("revalidate executor returns the failed tag without refreshing paths", () => {
  const calls = [];

  const result = runRevalidationOperations({
    paths: ["/en/contact"],
    revalidatePath: (path) => calls.push(`path:${path}`),
    revalidateTag: (tag) => {
      calls.push(`tag:${tag}`);
      throw new Error("tag refresh failed");
    },
    tags: ["published-page"],
  });

  assert.deepEqual(result, {
    error: {
      target: "published-page",
      targetType: "tag",
    },
    ok: false,
  });
  assert.deepEqual(calls, ["tag:published-page"]);
});

test("revalidate executor returns the failed path after refreshing tags", () => {
  const calls = [];

  const result = runRevalidationOperations({
    paths: ["/en/contact"],
    revalidatePath: (path) => {
      calls.push(`path:${path}`);
      throw new Error("path refresh failed");
    },
    revalidateTag: (tag) => calls.push(`tag:${tag}`),
    tags: ["published-page"],
  });

  assert.deepEqual(result, {
    error: {
      target: "/en/contact",
      targetType: "path",
    },
    ok: false,
  });
  assert.deepEqual(calls, ["tag:published-page", "path:/en/contact"]);
});
