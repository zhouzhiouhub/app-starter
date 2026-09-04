import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";

test("vercel storefront root check fails when Vercel builds the monorepo root", () => {
  const result = spawnSync(
    process.execPath,
    ["scripts/vercel-storefront-root.mjs"],
    {
      cwd: process.cwd(),
      encoding: "utf8",
      env: { ...process.env, VERCEL: "1" },
      windowsHide: true,
    },
  );

  assert.equal(result.status, 1);
  assert.match(result.stderr, /Root Directory to apps\/web/);
});

test("vercel storefront root check allows local workspace builds", () => {
  const result = spawnSync(
    process.execPath,
    ["scripts/vercel-storefront-root.mjs"],
    {
      cwd: process.cwd(),
      encoding: "utf8",
      env: { ...process.env, VERCEL: "" },
      windowsHide: true,
    },
  );

  assert.equal(result.status, 0);
});
