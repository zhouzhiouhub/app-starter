import { existsSync, mkdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";
import { setTimeout as delay } from "node:timers/promises";

const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

export function resolvePageBuilderVisualBrowserPath(
  browserPath,
  input = {},
) {
  if (browserPath) {
    return browserPath;
  }

  const candidates = getBrowserCandidates(input.env ?? process.env);
  const exists = input.exists ?? existsSync;

  for (const candidate of candidates) {
    if (!isFilePathCandidate(candidate) || exists(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    "No Chrome or Edge browser was found. Set --browser or PAGE_BUILDER_VISUAL_BROWSER.",
  );
}

export function createPageBuilderVisualScreenshotArgs(job, input) {
  return [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    "--run-all-compositor-stages-before-draw",
    "--virtual-time-budget=3000",
    "--no-first-run",
    "--disable-background-networking",
    `--user-data-dir=${input.profileDir}`,
    `--window-size=${job.width},${job.height}`,
    `--screenshot=${job.outputPath}`,
    job.url,
  ];
}

export async function waitForPageBuilderVisualScreenshot(
  outputPath,
  timeoutMs,
  input = {},
) {
  const deadline = Date.now() + timeoutMs;
  const readStats = input.stat ?? statSync;

  while (Date.now() < deadline) {
    try {
      const stats = readStats(outputPath);

      if (stats.isFile() && stats.size > pngSignature.length) {
        validatePageBuilderVisualScreenshotFile(outputPath, input);
        return stats;
      }
    } catch {
      // Keep polling until Chrome finishes writing the screenshot.
    }

    await delay(input.pollMs ?? 250);
  }

  throw new Error(`Timed out waiting for screenshot: ${outputPath}`);
}

export function validatePageBuilderVisualScreenshotFile(outputPath, input = {}) {
  const readFile = input.readFile ?? readFileSync;
  const header = readFile(outputPath).subarray(0, pngSignature.length);

  if (!header.equals(pngSignature)) {
    throw new Error(`Screenshot is not a PNG file: ${outputPath}`);
  }
}

export function createPageBuilderVisualProfileDir(input = {}) {
  const root = input.root ?? tmpdir();
  const id =
    input.id ??
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  const profileDir = path.join(root, `page-builder-visual-${id}`);
  mkdirSync(profileDir, { recursive: true });
  return profileDir;
}

function getBrowserCandidates(env) {
  return [
    path.join(
      env.PROGRAMFILES ?? "C:\\Program Files",
      "Google\\Chrome\\Application\\chrome.exe",
    ),
    path.join(
      env["PROGRAMFILES(X86)"] ?? "C:\\Program Files (x86)",
      "Google\\Chrome\\Application\\chrome.exe",
    ),
    path.join(
      env["PROGRAMFILES(X86)"] ?? "C:\\Program Files (x86)",
      "Microsoft\\Edge\\Application\\msedge.exe",
    ),
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    "google-chrome",
    "chromium",
    "chromium-browser",
    "microsoft-edge",
  ];
}

function isFilePathCandidate(candidate) {
  return (
    candidate.includes("/") ||
    candidate.includes("\\") ||
    /^[a-z]:/iu.test(candidate)
  );
}
