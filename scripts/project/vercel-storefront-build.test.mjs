import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { promoteWebNextOutput } from "../vercel-promote-web-next-output.mjs";
import { resolveStorefrontBuildPlan } from "../vercel-storefront-build.mjs";

test("Vercel storefront builds only the website packages and promotes Next output", () => {
  assert.deepEqual(resolveStorefrontBuildPlan({ VERCEL: "1" }), {
    pnpmArgs: [
      "--filter",
      "@app-starter/schema",
      "--filter",
      "@app-starter/design-tokens",
      "--filter",
      "@app-starter/ui",
      "--filter",
      "@app-starter/renderer",
      "--filter",
      "@app-starter/web",
      "build",
    ],
    promote: true,
  });
});

test("local workspace builds keep the recursive package build", () => {
  assert.deepEqual(resolveStorefrontBuildPlan({}), {
    pnpmArgs: ["-r", "--if-present", "build"],
    promote: false,
  });
});

test("promoting Next output copies apps/web/.next to the monorepo root", () => {
  const rootDir = mkdtempSync(join(tmpdir(), "vercel-storefront-"));
  mkdirSync(join(rootDir, "apps/web/.next"), { recursive: true });
  writeFileSync(
    join(rootDir, "apps/web/next.config.mjs"),
    "export default {};\n",
  );
  writeFileSync(join(rootDir, "apps/web/.next/BUILD_ID"), "test-build\n");

  try {
    assert.deepEqual(promoteWebNextOutput(rootDir), {
      reason: "copied-web-next",
      status: "copied",
    });
    assert.equal(
      readFileSync(join(rootDir, ".next/BUILD_ID"), "utf8"),
      "test-build\n",
    );
  } finally {
    rmSync(rootDir, { force: true, recursive: true });
  }
});

test("promoting Next output is skipped outside the storefront monorepo root", () => {
  const rootDir = mkdtempSync(join(tmpdir(), "vercel-storefront-"));

  try {
    assert.deepEqual(promoteWebNextOutput(rootDir), {
      reason: "not-monorepo-root",
      status: "skipped",
    });
  } finally {
    rmSync(rootDir, { force: true, recursive: true });
  }
});

test("promoting Next output fails when the storefront build is missing", () => {
  const rootDir = mkdtempSync(join(tmpdir(), "vercel-storefront-"));
  mkdirSync(join(rootDir, "apps/web"), { recursive: true });
  writeFileSync(
    join(rootDir, "apps/web/next.config.mjs"),
    "export default {};\n",
  );

  try {
    assert.throws(
      () => promoteWebNextOutput(rootDir),
      /apps\/web\/\.next was not produced/,
    );
  } finally {
    rmSync(rootDir, { force: true, recursive: true });
  }
});
