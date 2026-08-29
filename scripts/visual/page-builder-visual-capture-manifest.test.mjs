import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import test from "node:test";
import { runPageBuilderVisualCapture } from "./page-builder-visual-capture.mjs";

test("visual capture can write preview screenshot paths back to the manifest", async () => {
  const root = `tmp/visual-capture-manifest-${process.pid}-${Date.now()}`;
  const manifestPath = `${root}/manifest.json`;
  const outputDir = createTestOutputDir("manifest");

  rmSync(root, { force: true, recursive: true });
  rmSync(outputDir, { force: true, recursive: true });
  mkdirSync(root, { recursive: true });
  writeFileSync(manifestPath, `${JSON.stringify(createManifest(), null, 2)}\n`);

  try {
    const result = await runPageBuilderVisualCapture(
      {
        baseUrl: "http://localhost:3000",
        browserPath: "chrome",
        components: ["hero-banner"],
        manifestPath,
        outputDir,
        timeoutMs: 2000,
        viewports: ["desktop"],
        writeManifest: true,
      },
      {
        fetch: async () => ({ status: 200 }),
        screenshotInput: { pollMs: 1 },
        spawn: (_command, args) => createSuccessfulBrowser(args),
      },
    );

    const updated = JSON.parse(readFileSync(manifestPath, "utf8"));
    const evidence = updated.records[0].viewports.desktop;

    assert.equal(result.manifestUpdate.updated, true);
    assert.equal(result.manifestUpdate.updates.length, 1);
    assert.equal(updated.records[0].status, "needs-evidence");
    assert.equal(
      evidence.previewScreenshot,
      `${outputDir}/page-builder-visual-fixture-hero-banner-desktop.png`,
    );
    assert.equal(evidence.status, "needs-evidence");
    assert.equal(evidence.visualMatchPercent, null);
    assert.equal(evidence.maxLayoutDeltaPx, null);
    assert.equal(evidence.maxColorDeltaE, null);
    assert.equal(evidence.designReference, "docs/visual/hero-banner-desktop.png");
  } finally {
    rmSync(root, { force: true, recursive: true });
    rmSync(outputDir, { force: true, recursive: true });
  }
});

test("visual capture rejects manifest updates for missing viewport slots", async () => {
  const root = `tmp/visual-capture-missing-${process.pid}-${Date.now()}`;
  const manifestPath = `${root}/manifest.json`;
  const outputDir = createTestOutputDir("missing");

  rmSync(root, { force: true, recursive: true });
  rmSync(outputDir, { force: true, recursive: true });
  mkdirSync(root, { recursive: true });
  writeFileSync(manifestPath, `${JSON.stringify({ records: [] })}\n`);

  try {
    await assert.rejects(
      () =>
        runPageBuilderVisualCapture(
          {
            baseUrl: "http://localhost:3000",
            browserPath: "chrome",
            components: ["hero-banner"],
            manifestPath,
            outputDir,
            timeoutMs: 2000,
            viewports: ["desktop"],
            writeManifest: true,
          },
          {
            fetch: async () => ({ status: 200 }),
            screenshotInput: { pollMs: 1 },
            spawn: (_command, args) => createSuccessfulBrowser(args),
          },
        ),
      /Visual capture manifest is missing hero-banner\.desktop/,
    );
  } finally {
    rmSync(root, { force: true, recursive: true });
    rmSync(outputDir, { force: true, recursive: true });
  }
});

function createTestOutputDir(label) {
  return `reports/visual/capture-${label}-${process.pid}-${Date.now()}`;
}

function createSuccessfulBrowser(args) {
  const child = new EventEmitter();
  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
  child.exitCode = null;
  child.killed = false;
  child.kill = () => {
    child.killed = true;
    queueMicrotask(() => child.emit("exit", 0, null));
  };

  const screenshotArg = args.find((arg) => arg.startsWith("--screenshot="));
  writeFileSync(screenshotArg.slice("--screenshot=".length), validScreenshotPng);

  return child;
}

const validScreenshotPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR4nGNgAAIAAAUAAXpeqz8AAAAASUVORK5CYII=",
  "base64",
);

function createManifest() {
  return {
    records: [
      {
        component: "hero-banner",
        status: "accepted",
        viewports: {
          desktop: {
            designReference: "docs/visual/hero-banner-desktop.png",
            maxColorDeltaE: 1,
            maxLayoutDeltaPx: 1,
            previewScreenshot: "artifacts/visual/old-hero-banner-desktop.png",
            status: "accepted",
            visualMatchPercent: 99,
          },
        },
      },
    ],
  };
}
