import {
  cpSync,
  existsSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { rewriteNftDocument } from "./vercel-rewrite-next-nft-traces.mjs";

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
  rewriteCopiedNftTraces(webNext, rootNext);
  return { reason: "copied-web-next", status: "copied" };
}

function rewriteCopiedNftTraces(webNext, rootNext) {
  for (const nftPath of listNftFiles(rootNext)) {
    const originalDir = dirname(join(webNext, relative(rootNext, nftPath)));
    const document = JSON.parse(readFileSync(nftPath, "utf8"));
    writeFileSync(
      nftPath,
      `${JSON.stringify(
        rewriteNftDocument(
          document,
          originalDir,
          dirname(nftPath),
          webNext,
          rootNext,
        ),
      )}\n`,
    );
  }
}

function listNftFiles(dir) {
  const files = [];

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      if (entry.name === "cache") {
        continue;
      }
      files.push(...listNftFiles(fullPath));
      continue;
    }

    if (entry.name.endsWith(".nft.json")) {
      files.push(fullPath);
    }
  }

  return files;
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
        "Copied apps/web/.next to the repository root and rewrote Next file traces for Vercel.",
      );
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
