import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import { promoteWebNextOutput } from "../vercel-promote-web-next-output.mjs";
import { rewriteNftTracePath } from "../vercel-rewrite-next-nft-traces.mjs";
import {
  assertWebNextBuildOutput,
  resolveStorefrontBuildPlan,
  vercelStorefrontOutputDirectory,
} from "../vercel-storefront-build.mjs";

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

test("root vercel.json keeps a Next.js output path for apps/web/.next", () => {
  const config = JSON.parse(readFileSync("vercel.json", "utf8"));

  assert.equal(config.framework, "nextjs");
  assert.equal(config.outputDirectory, vercelStorefrontOutputDirectory);
  assert.equal(config.buildCommand, "node scripts/vercel-storefront-build.mjs");
});

test("rewriting Next traces removes the apps/web extra parent directories", () => {
  const rootDir = resolve(tmpdir(), "nft-rewrite-root");
  const originalDir = join(rootDir, "apps/web/.next/server/app");
  const newDir = join(rootDir, ".next/server/app");
  const webNext = join(rootDir, "apps/web/.next");
  const rootNext = join(rootDir, ".next");
  const traced =
    "../../../../../node_modules/.pnpm/@swc+helpers@0.5.15/node_modules/@swc/helpers/_/_interop_require_default/package.json";

  assert.equal(
    rewriteNftTracePath(traced, originalDir, newDir, webNext, rootNext),
    "../../../node_modules/.pnpm/@swc+helpers@0.5.15/node_modules/@swc/helpers/_/_interop_require_default/package.json",
  );
  assert.equal(
    rewriteNftTracePath(
      "../webpack-runtime.js",
      originalDir,
      newDir,
      webNext,
      rootNext,
    ),
    "../webpack-runtime.js",
  );
});

test("promoting Next output copies apps/web/.next and rewrites file traces", () => {
  const rootDir = mkdtempSync(join(tmpdir(), "vercel-storefront-"));
  const originalDir = join(rootDir, "apps/web/.next/server/app");
  mkdirSync(originalDir, { recursive: true });
  writeFileSync(
    join(rootDir, "apps/web/next.config.mjs"),
    "export default {};\n",
  );
  writeFileSync(join(rootDir, "apps/web/.next/BUILD_ID"), "test-build\n");
  writeFileSync(
    join(originalDir, "page.js.nft.json"),
    `${JSON.stringify({
      version: 1,
      files: [
        "../webpack-runtime.js",
        "../../../../../node_modules/.pnpm/@swc+helpers@0.5.15/node_modules/@swc/helpers/_/_interop_require_default/package.json",
      ],
    })}\n`,
  );

  try {
    assert.deepEqual(promoteWebNextOutput(rootDir), {
      reason: "copied-web-next",
      status: "copied",
    });
    assert.equal(
      readFileSync(join(rootDir, ".next/BUILD_ID"), "utf8"),
      "test-build\n",
    );
    assert.deepEqual(
      JSON.parse(
        readFileSync(
          join(rootDir, ".next/server/app/page.js.nft.json"),
          "utf8",
        ),
      ).files,
      [
        "../webpack-runtime.js",
        "../../../node_modules/.pnpm/@swc+helpers@0.5.15/node_modules/@swc/helpers/_/_interop_require_default/package.json",
      ],
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

test("Vercel storefront build requires apps/web/.next", () => {
  const rootDir = mkdtempSync(join(tmpdir(), "vercel-storefront-"));
  mkdirSync(join(rootDir, vercelStorefrontOutputDirectory), {
    recursive: true,
  });
  writeFileSync(
    join(rootDir, vercelStorefrontOutputDirectory, "BUILD_ID"),
    "test-build\n",
  );

  try {
    assert.equal(
      assertWebNextBuildOutput(rootDir),
      resolve(rootDir, vercelStorefrontOutputDirectory, "BUILD_ID"),
    );
  } finally {
    rmSync(rootDir, { force: true, recursive: true });
  }
});
