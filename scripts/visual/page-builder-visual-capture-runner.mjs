import { mkdirSync } from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";
import {
  createPageBuilderVisualProfileDir,
  createPageBuilderVisualScreenshotArgs,
  resolvePageBuilderVisualBrowserPath,
  waitForPageBuilderVisualScreenshot,
} from "./page-builder-visual-capture-browser.mjs";
import {
  createPageBuilderVisualCaptureJobs,
  createPageBuilderVisualCaptureUrl,
} from "./page-builder-visual-capture-jobs.mjs";

export async function runPageBuilderVisualCapture(config, input = {}) {
  const browserPath = resolvePageBuilderVisualBrowserPath(config.browserPath, {
    env: input.env,
    exists: input.exists,
  });

  await assertPageBuilderVisualFixtureAvailable(config, input);
  mkdirSync(path.resolve(config.outputDir), { recursive: true });

  const screenshots = [];

  for (const job of createPageBuilderVisualCaptureJobs(config)) {
    screenshots.push(
      await capturePageBuilderVisualScreenshot(job, {
        ...input,
        browserPath,
        timeoutMs: config.timeoutMs,
      }),
    );
  }

  return {
    baseUrl: config.baseUrl,
    browserPath,
    outputDir: config.outputDir,
    screenshots,
  };
}

export async function assertPageBuilderVisualFixtureAvailable(config, input = {}) {
  const fetcher = input.fetch ?? fetch;
  const url = createPageBuilderVisualCaptureUrl(
    config.baseUrl,
    config.components[0],
    config.viewports[0],
  );
  const response = await fetcher(url, { redirect: "manual" });

  if (!response || response.status !== 200) {
    throw new Error(
      `Page Builder visual fixture returned ${
        response?.status ?? "no response"
      } for ${url}. Start Web with ENABLE_VISUAL_ACCEPTANCE_FIXTURE=true first.`,
    );
  }
}

async function capturePageBuilderVisualScreenshot(job, input) {
  const profileDir =
    input.profileDir ?? createPageBuilderVisualProfileDir({ root: input.tmpRoot });
  const args = createPageBuilderVisualScreenshotArgs(job, { profileDir });
  const child = (input.spawn ?? spawn)(input.browserPath, args, {
    stdio: "ignore",
    windowsHide: true,
  });

  await waitForBrowserExit(child, input.timeoutMs);
  const stats = await waitForPageBuilderVisualScreenshot(
    job.outputPath,
    input.timeoutMs,
  );

  return {
    bytes: stats.size,
    component: job.component,
    evidencePath: job.evidencePath,
    viewport: job.viewport,
  };
}

function waitForBrowserExit(child, timeoutMs) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error("Timed out waiting for browser screenshot process."));
    }, timeoutMs);

    child.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });

    child.once("exit", (code, signal) => {
      clearTimeout(timer);

      if (code && code !== 0) {
        reject(
          new Error(`Browser screenshot failed with code ${code} and signal ${signal}.`),
        );
        return;
      }

      resolve();
    });
  });
}
