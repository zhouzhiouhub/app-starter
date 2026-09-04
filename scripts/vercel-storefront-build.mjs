import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { promoteWebNextOutput } from "./vercel-promote-web-next-output.mjs";

export const storefrontPackageNames = [
  "@app-starter/schema",
  "@app-starter/design-tokens",
  "@app-starter/ui",
  "@app-starter/renderer",
  "@app-starter/web",
];

export const vercelStorefrontOutputDirectory = "apps/web/.next";

export function resolveStorefrontBuildPlan(env = process.env) {
  if (env.VERCEL === "1") {
    return {
      pnpmArgs: [
        ...storefrontPackageNames.flatMap((name) => ["--filter", name]),
        "build",
      ],
      promote: true,
    };
  }

  return {
    pnpmArgs: ["-r", "--if-present", "build"],
    promote: false,
  };
}

export function assertWebNextBuildOutput(rootDir = process.cwd()) {
  const buildIdPath = resolve(
    rootDir,
    vercelStorefrontOutputDirectory,
    "BUILD_ID",
  );

  if (!existsSync(buildIdPath)) {
    throw new Error(
      `${vercelStorefrontOutputDirectory} was not produced; the storefront build did not finish.`,
    );
  }

  return buildIdPath;
}

function runPnpm(args) {
  const result = spawnSync("pnpm", args, {
    env: process.env,
    shell: process.platform === "win32",
    stdio: "inherit",
  });

  return result.status ?? 1;
}

function runStorefrontBuild() {
  const plan = resolveStorefrontBuildPlan();
  const status = runPnpm(plan.pnpmArgs);

  if (status !== 0) {
    process.exit(status);
  }

  if (!plan.promote) {
    return;
  }

  assertWebNextBuildOutput(process.cwd());
  const result = promoteWebNextOutput(process.cwd());

  if (result.status === "copied") {
    console.log(
      "Copied apps/web/.next to the repository root and rewrote Next file traces for Vercel.",
    );
  }
}

function isDirectRun() {
  return Boolean(
    process.argv[1] &&
    import.meta.url.toLowerCase() ===
      pathToFileURL(resolve(process.argv[1])).href.toLowerCase(),
  );
}

if (isDirectRun()) {
  try {
    runStorefrontBuild();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
