import { mkdirSync, rmSync } from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import {
  appendBrowserOutput,
  createBrowserOutputCollector,
  createPageBuilderVisualProfileDir,
  createPageBuilderVisualScreenshotArgs,
  formatCaptureErrorSentence,
  resolvePageBuilderVisualBrowserPath,
  waitForPageBuilderVisualScreenshot,
} from "./page-builder-visual-capture-browser.mjs";
import {
  createPageBuilderVisualCaptureJobs,
  createPageBuilderVisualCaptureUrl,
} from "./page-builder-visual-capture-jobs.mjs";
import { updatePageBuilderVisualCaptureManifest } from "./page-builder-visual-capture-manifest.mjs";

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

  const result = {
    baseUrl: config.baseUrl,
    browserPath,
    outputDir: config.outputDir,
    screenshots,
  };

  return {
    ...result,
    manifestUpdate: updatePageBuilderVisualCaptureManifest(
      config,
      result,
      input,
    ),
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
  let child;

  try {
    removeStalePageBuilderVisualScreenshot(job.outputPath, input);
    child = (input.spawn ?? spawn)(input.browserPath, args, {
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
  } catch (error) {
    throw new Error(
      appendBrowserOutput(
        `Browser screenshot process failed: ${formatCaptureErrorSentence(
          error,
        )}`,
        "",
      ),
    );
  }

  const browserOutput = createBrowserOutputCollector(child);
  const browserExit = observeBrowserExit(child, input.timeoutMs, {
    readOutput: browserOutput.read,
  });

  const screenshotReady = waitForPageBuilderVisualScreenshot(
    job.outputPath,
    input.timeoutMs,
    input.screenshotInput,
  );
  const outcome = await Promise.race([
    screenshotReady.then((stats) => ({ stats, type: "screenshot" })),
    browserExit.promise.then(
      () => ({ type: "exit" }),
      (error) => ({ error, type: "error" }),
    ),
  ]);

  if (outcome.type === "error") {
    throw outcome.error;
  }

  const stats =
    outcome.type === "screenshot"
      ? await stopBrowserAfterScreenshot(child, browserExit, outcome.stats)
      : await screenshotReady;

  return {
    bytes: stats.size,
    component: job.component,
    evidencePath: job.evidencePath,
    viewport: job.viewport,
  };
}

function removeStalePageBuilderVisualScreenshot(outputPath, input) {
  (input.removeFile ?? rmSync)(outputPath, { force: true });
}

async function stopBrowserAfterScreenshot(child, browserExit, stats) {
  if (!browserExit.isSettled() && !child.killed) {
    child.kill();
  }

  await Promise.race([browserExit.promise.catch(() => undefined), delay(1000)]);
  browserExit.cancel();
  return stats;
}

function observeBrowserExit(child, timeoutMs, input = {}) {
  let settled = false;
  let timer;
  let onError;
  let onExit;
  const readOutput = input.readOutput ?? (() => "");

  const promise = new Promise((resolve, reject) => {
    timer = setTimeout(() => {
      child.kill();
      reject(
        new Error(
          appendBrowserOutput(
            "Timed out waiting for browser screenshot process.",
            readOutput(),
          ),
        ),
      );
    }, timeoutMs);

    onError = (error) => {
      settled = true;
      clearTimeout(timer);
      reject(
        new Error(
          appendBrowserOutput(
            `Browser screenshot process failed: ${formatCaptureErrorSentence(
              error,
            )}`,
            readOutput(),
          ),
        ),
      );
    };

    onExit = (code, signal) => {
      settled = true;
      clearTimeout(timer);

      if (code && code !== 0) {
        reject(
          new Error(
            appendBrowserOutput(
              `Browser screenshot failed with code ${code} and signal ${signal}.`,
              readOutput(),
            ),
          ),
        );
        return;
      }

      resolve();
    };

    child.once("error", onError);
    child.once("exit", onExit);
  });

  return {
    cancel: () => {
      clearTimeout(timer);
      child.off?.("error", onError);
      child.off?.("exit", onExit);
    },
    isSettled: () => settled,
    promise,
  };
}
