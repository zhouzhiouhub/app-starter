import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import {
  existsSync,
  mkdtempSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  runPageBuilderVisualCapture,
  validatePageBuilderVisualScreenshotFile,
  waitForPageBuilderVisualScreenshot,
} from "./page-builder-visual-capture.mjs";

test("visual capture validates complete PNG screenshot files", () => {
  validatePageBuilderVisualScreenshotFile("fixture.png", {
    readFile: () => validScreenshotPng,
  });
  assert.throws(
    () =>
      validatePageBuilderVisualScreenshotFile("fixture.png", {
        readFile: () => Buffer.from("not-png"),
      }),
    /not a PNG/,
  );
  assert.throws(
    () =>
      validatePageBuilderVisualScreenshotFile("fixture.png", {
        readFile: () => validScreenshotPng.subarray(0, 9),
      }),
    /IEND|offset|PNG/,
  );
});

test("visual capture waits until screenshot PNG files are complete", async () => {
  const outputDir = mkdtempSync(path.join(tmpdir(), "visual-capture-stable-"));
  const outputPath = path.join(outputDir, "fixture.png");
  let statCalls = 0;

  writeFileSync(outputPath, validScreenshotPng.subarray(0, 9));

  try {
    const stats = await waitForPageBuilderVisualScreenshot(outputPath, 2000, {
      pollMs: 1,
      stat: (filePath) => {
        statCalls += 1;

        if (statCalls === 2) {
          writeFileSync(filePath, validScreenshotPng);
        }

        return statSync(filePath);
      },
    });

    assert.equal(stats.size, validScreenshotPng.length);
    assert.equal(statCalls, 2);
  } finally {
    rmSync(outputDir, { force: true, recursive: true });
  }
});

test("visual capture completes when PNG is written before browser exits", async () => {
  const outputDir = mkdtempSync(path.join(tmpdir(), "visual-capture-ready-"));

  try {
    const child = createBrowserProcess();
    const result = await runPageBuilderVisualCapture(
      {
        baseUrl: "http://localhost:3000",
        browserPath: "chrome",
        components: ["hero-banner"],
        outputDir,
        timeoutMs: 2000,
        viewports: ["desktop"],
      },
      {
        fetch: async () => ({ status: 200 }),
        screenshotInput: { pollMs: 1 },
        spawn: (_command, args) => {
          writeFileSync(readScreenshotPath(args), validScreenshotPng);
          return child;
        },
      },
    );

    assert.equal(child.killed, true);
    assert.equal(result.screenshots.length, 1);
    assert.equal(result.screenshots[0].bytes, validScreenshotPng.length);
  } finally {
    rmSync(outputDir, { force: true, recursive: true });
  }
});

test("visual capture removes stale screenshots before waiting", async () => {
  const outputDir = mkdtempSync(path.join(tmpdir(), "visual-capture-stale-"));

  writeFileSync(
    path.join(outputDir, "page-builder-visual-fixture-hero-banner-desktop.png"),
    validScreenshotPng,
  );

  try {
    const child = createBrowserProcess();
    const result = await runPageBuilderVisualCapture(
      {
        baseUrl: "http://localhost:3000",
        browserPath: "chrome",
        components: ["hero-banner"],
        outputDir,
        timeoutMs: 2000,
        viewports: ["desktop"],
      },
      {
        fetch: async () => ({ status: 200 }),
        screenshotInput: { pollMs: 1 },
        spawn: (_command, args) => {
          const outputPath = readScreenshotPath(args);

          assert.equal(existsSync(outputPath), false);
          writeFileSync(outputPath, validScreenshotPng);
          return child;
        },
      },
    );

    assert.equal(child.killed, true);
    assert.equal(result.screenshots[0].bytes, validScreenshotPng.length);
  } finally {
    rmSync(outputDir, { force: true, recursive: true });
  }
});

function createBrowserProcess() {
  const child = new EventEmitter();
  child.exitCode = null;
  child.killed = false;
  child.kill = () => {
    child.killed = true;
    queueMicrotask(() => child.emit("exit", 0, null));
  };
  return child;
}

function readScreenshotPath(args) {
  const screenshotArg = args.find((arg) => arg.startsWith("--screenshot="));
  return screenshotArg.slice("--screenshot=".length);
}

const validScreenshotPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR4nGNgAAIAAAUAAXpeqz8AAAAASUVORK5CYII=",
  "base64",
);
