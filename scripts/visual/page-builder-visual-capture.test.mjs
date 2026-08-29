import assert from "node:assert/strict";
import test from "node:test";
import {
  assertPageBuilderVisualFixtureAvailable,
  createPageBuilderVisualCaptureJobs,
  createPageBuilderVisualCaptureUrl,
  createPageBuilderVisualScreenshotArgs,
  formatPageBuilderVisualCaptureReport,
  pageBuilderVisualCaptureComponents,
  pageBuilderVisualCaptureDefaultOutputDir,
  readCaptureManifestPath,
  readCaptureOutputDir,
  readCaptureReportPath,
  readPageBuilderVisualCaptureCliConfig,
  resolvePageBuilderVisualBrowserPath,
} from "./page-builder-visual-capture.mjs";

test("visual capture config reads defaults and env browser fallback", () => {
  const config = readPageBuilderVisualCaptureCliConfig([], {
    CHROME_PATH: "C:/Chrome/chrome.exe",
  });

  assert.equal(config.baseUrl, "http://localhost:3000");
  assert.equal(config.browserPath, "C:/Chrome/chrome.exe");
  assert.deepEqual(config.components, pageBuilderVisualCaptureComponents);
  assert.equal(
    config.manifestPath,
    "docs/development/page-builder-visual-acceptance.json",
  );
  assert.equal(config.outputDir, pageBuilderVisualCaptureDefaultOutputDir);
  assert.equal(config.reportPath, null);
  assert.equal(config.timeoutMs, 30000);
  assert.deepEqual(config.viewports, ["desktop", "mobile"]);
  assert.equal(config.writeManifest, false);
});

test("visual capture config parses selected components, viewports, and manifest updates", () => {
  const config = readPageBuilderVisualCaptureCliConfig([
    "--",
    "--base-url",
    "https://web.example.com",
    "--browser",
    "C:/Chrome/chrome.exe",
    "--component",
    "hero-banner,faq",
    "--component",
    "faq",
    "--manifest",
    "tmp/page-builder-visual-acceptance.json",
    "--output-dir",
    "reports/visual/page-builder",
    "--report",
    "reports/visual/page-builder/visual-capture-report.json",
    "--timeout-ms",
    "45000",
    "--viewport",
    "mobile",
    "--write-manifest",
  ]);

  assert.deepEqual(config, {
    baseUrl: "https://web.example.com",
    browserPath: "C:/Chrome/chrome.exe",
    components: ["hero-banner", "faq"],
    manifestPath: "tmp/page-builder-visual-acceptance.json",
    outputDir: "reports/visual/page-builder",
    reportPath: "reports/visual/page-builder/visual-capture-report.json",
    timeoutMs: 45000,
    viewports: ["mobile"],
    writeManifest: true,
  });
  assert.equal(
    readCaptureOutputDir(String.raw`reports\\visual\\page-builder`),
    "reports/visual/page-builder",
  );
  assert.equal(
    readCaptureManifestPath(
      String.raw`docs\\development\\page-builder-visual-acceptance.json`,
    ),
    "docs/development/page-builder-visual-acceptance.json",
  );
  assert.equal(
    readCaptureReportPath(
      String.raw`reports\\visual\\page-builder\\visual-capture-report.json`,
    ),
    "reports/visual/page-builder/visual-capture-report.json",
  );
});

test("visual capture config rejects unsafe inputs", () => {
  assert.throws(
    () =>
      readPageBuilderVisualCaptureCliConfig([
        "--base-url",
        "ftp://localhost:3000",
      ]),
    /http or https/,
  );
  assert.throws(
    () => readPageBuilderVisualCaptureCliConfig(["--component", "product-card"]),
    /Unknown visual capture component/,
  );
  assert.throws(
    () => readPageBuilderVisualCaptureCliConfig(["--viewport", "tablet"]),
    /Unknown visual capture viewport/,
  );
  assert.throws(
    () => readCaptureOutputDir("../artifacts/visual"),
    /unsafe path segments/,
  );
  assert.throws(
    () => readCaptureOutputDir("tmp/visual"),
    /must live under artifacts\/visual or reports\/visual/,
  );
  assert.throws(
    () => readCaptureOutputDir("artifacts/visual/bad:path"),
    /unsafe characters/,
  );
  assert.throws(
    () => readCaptureManifestPath("../docs/development/visual.json"),
    /unsafe path segments/,
  );
  assert.throws(
    () => readCaptureManifestPath("README.md"),
    /must live under/,
  );
  assert.throws(
    () => readCaptureManifestPath("docs/development/visual.md"),
    /must end with \.json/,
  );
  assert.throws(
    () => readCaptureReportPath("README.md"),
    /must be under/,
  );
  assert.throws(
    () => readCaptureReportPath("reports/visual/capture.md"),
    /must end with \.json/,
  );
});

test("visual capture jobs point to fixture component URLs and evidence paths", () => {
  const config = readPageBuilderVisualCaptureCliConfig([
    "--component",
    "hero-banner",
    "--viewport",
    "desktop,mobile",
  ]);
  const jobs = createPageBuilderVisualCaptureJobs(config);

  assert.equal(jobs.length, 2);
  assert.deepEqual(
    jobs.map((job) => ({
      component: job.component,
      evidencePath: job.evidencePath,
      height: job.height,
      url: job.url,
      viewport: job.viewport,
      width: job.width,
    })),
    [
      {
        component: "hero-banner",
        evidencePath:
          "artifacts/visual/page-builder-visual-fixture-hero-banner-desktop.png",
        height: 1000,
        url: "http://localhost:3000/visual-acceptance?viewport=desktop&component=hero-banner",
        viewport: "desktop",
        width: 1440,
      },
      {
        component: "hero-banner",
        evidencePath:
          "artifacts/visual/page-builder-visual-fixture-hero-banner-mobile.png",
        height: 1000,
        url: "http://localhost:3000/visual-acceptance?viewport=mobile&component=hero-banner",
        viewport: "mobile",
        width: 390,
      },
    ],
  );
});

test("visual capture creates deterministic fixture URLs", () => {
  assert.equal(
    createPageBuilderVisualCaptureUrl(
      "http://localhost:3000",
      "image-gallery",
      "mobile",
    ),
    "http://localhost:3000/visual-acceptance?viewport=mobile&component=image-gallery",
  );
});

test("visual capture resolves explicit and discovered browser paths", () => {
  assert.equal(
    resolvePageBuilderVisualBrowserPath("C:/Explicit/chrome.exe"),
    "C:/Explicit/chrome.exe",
  );
  assert.equal(
    resolvePageBuilderVisualBrowserPath(undefined, {
      env: { PROGRAMFILES: "C:\\Program Files" },
      exists: (candidate) =>
        candidate ===
        "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    }),
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  );
});

test("visual capture builds Chrome screenshot arguments", () => {
  const [job] = createPageBuilderVisualCaptureJobs(
    readPageBuilderVisualCaptureCliConfig([
      "--component",
      "cta-bar",
      "--viewport",
      "desktop",
    ]),
  );
  const args = createPageBuilderVisualScreenshotArgs(job, {
    profileDir: "tmp/profile",
  });

  assert.deepEqual(args.slice(0, 3), [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
  ]);
  assert.ok(args.includes("--user-data-dir=tmp/profile"));
  assert.ok(args.includes("--window-size=1440,1000"));
  assert.ok(args.some((arg) => arg.startsWith("--screenshot=")));
  assert.equal(args.at(-1), job.url);
});

test("visual capture verifies fixture availability before capture", async () => {
  const config = readPageBuilderVisualCaptureCliConfig([
    "--component",
    "hero-banner",
    "--viewport",
    "desktop",
  ]);

  await assertPageBuilderVisualFixtureAvailable(config, {
    fetch: async (url) => {
      assert.equal(
        url,
        "http://localhost:3000/visual-acceptance?viewport=desktop&component=hero-banner",
      );
      return { status: 200 };
    },
  });

  await assert.rejects(
    () =>
      assertPageBuilderVisualFixtureAvailable(config, {
        fetch: async () => ({ status: 404 }),
      }),
    /ENABLE_VISUAL_ACCEPTANCE_FIXTURE=true/,
  );
});

test("visual capture report includes every captured screenshot", () => {
  const lines = formatPageBuilderVisualCaptureReport({
    baseUrl: "http://localhost:3000",
    browserPath: "chrome",
    outputDir: "artifacts/visual",
    manifestUpdate: {
      manifestPath: "docs/development/page-builder-visual-acceptance.json",
      updated: true,
      updates: [
        {
          component: "hero-banner",
          previewScreenshot: "artifacts/visual/hero.png",
          viewport: "desktop",
        },
      ],
    },
    screenshots: [
      {
        bytes: 123,
        component: "hero-banner",
        evidencePath: "artifacts/visual/hero.png",
        viewport: "desktop",
      },
    ],
  });

  assert.match(lines.join("\n"), /Screenshots: 1/);
  assert.match(lines.join("\n"), /Manifest: docs\/development\/page-builder-visual-acceptance\.json \(updated 1\)/);
  assert.match(lines.join("\n"), /hero-banner\.desktop/);
  assert.match(lines.join("\n"), /123 bytes/);
});
