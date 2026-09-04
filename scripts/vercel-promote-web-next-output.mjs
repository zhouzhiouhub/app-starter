import { cpSync, existsSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export function resolveWebNextOutputPaths(rootDir) {
  return {
    isStorefrontMonorepoRoot: existsSync(
      resolve(rootDir, "apps/web/next.config.mjs"),
    ),
    rootNext: resolve(rootDir, ".next"),
    webNext: resolve(rootDir, "apps/web/.next"),
  };
}

export function promoteWebNextOutput(rootDir = process.cwd()) {
  const { isStorefrontMonorepoRoot, rootNext, webNext } =
    resolveWebNextOutputPaths(rootDir);

  if (!isStorefrontMonorepoRoot) {
    return { reason: "not-monorepo-root", status: "skipped" };
  }

  if (!existsSync(webNext)) {
    throw new Error(
      "apps/web/.next was not produced; the storefront build did not finish.",
    );
  }

  if (webNext === rootNext) {
    return { reason: "already-root", status: "skipped" };
  }

  rmSync(rootNext, { recursive: true, force: true });
  cpSync(webNext, rootNext, { recursive: true });
  return { reason: "copied-web-next", status: "copied" };
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
    const result = promoteWebNextOutput();

    if (result.status === "copied") {
      console.log(
        "Copied apps/web/.next to the repository root so Vercel can deploy the storefront.",
      );
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
