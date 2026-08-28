import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import test from "node:test";
import {
  formatPageBuilderVisualFixtureCaptureReport,
  createPageBuilderVisualPnpmProcess,
  readLocalFixturePort,
  readPageBuilderVisualFixtureCaptureCliConfig,
  readPnpmInvocation,
  runPageBuilderVisualFixtureCapture,
  startPageBuilderVisualFixtureServer,
  waitForPageBuilderVisualFixture,
  waitForPageBuilderVisualProcessExit,
} from "./page-builder-visual-fixture-capture.mjs";

test("visual fixture capture config wraps capture defaults", () => {
  const config = readPageBuilderVisualFixtureCaptureCliConfig([], {
    PAGE_BUILDER_VISUAL_BROWSER: "C:/Chrome/chrome.exe",
  });

  assert.equal(config.capture.baseUrl, "http://localhost:3000");
  assert.equal(config.capture.browserPath, "C:/Chrome/chrome.exe");
  assert.equal(config.skipBuild, false);
  assert.equal(config.startTimeoutMs, 60000);
  assert.equal(config.webPort, 3000);
});

test("visual fixture capture config parses workflow and capture options", () => {
  const config = readPageBuilderVisualFixtureCaptureCliConfig([
    "--",
    "--skip-build",
    "--start-timeout-ms",
    "45000",
    "--base-url",
    "http://127.0.0.1:3010",
    "--component",
    "hero-banner,faq",
    "--viewport",
    "mobile",
    "--output-dir",
    "reports/visual/page-builder",
  ]);

  assert.equal(config.skipBuild, true);
  assert.equal(config.startTimeoutMs, 45000);
  assert.equal(config.webPort, 3010);
  assert.equal(config.capture.baseUrl, "http://127.0.0.1:3010");
  assert.deepEqual(config.capture.components, ["hero-banner", "faq"]);
  assert.deepEqual(config.capture.viewports, ["mobile"]);
  assert.equal(config.capture.outputDir, "reports/visual/page-builder");
});

test("visual fixture capture rejects non-local or ambiguous Web URLs", () => {
  assert.throws(
    () => readLocalFixturePort("https://localhost:3000"),
    /local http/,
  );
  assert.throws(
    () => readLocalFixturePort("http://example.com:3000"),
    /localhost or loopback/,
  );
  assert.throws(
    () => readLocalFixturePort("http://localhost"),
    /explicit port/,
  );
  assert.throws(
    () =>
      readPageBuilderVisualFixtureCaptureCliConfig([
        "--start-timeout-ms",
        "10",
      ]),
    /start timeout/,
  );
});

test("visual fixture capture waits until the fixture is available", async () => {
  let attempts = 0;
  const config = readPageBuilderVisualFixtureCaptureCliConfig([
    "--component",
    "hero-banner",
    "--viewport",
    "desktop",
    "--start-timeout-ms",
    "2000",
  ]);

  await waitForPageBuilderVisualFixture(config, {
    fetch: async () => ({ status: ++attempts === 2 ? 200 : 404 }),
    pollMs: 1,
  });

  assert.equal(attempts, 2);
});

test("visual fixture capture reports early server exits", async () => {
  const config = readPageBuilderVisualFixtureCaptureCliConfig([
    "--component",
    "hero-banner",
    "--viewport",
    "desktop",
  ]);

  await assert.rejects(
    () =>
      waitForPageBuilderVisualFixture(config, {
        fetch: async () => ({ status: 404 }),
        server: { exitCode: 1 },
      }),
    /exited early/,
  );
});

test("visual fixture capture runs build, server, capture, and stop", async () => {
  const calls = [];
  const server = { exitCode: null };
  const config = readPageBuilderVisualFixtureCaptureCliConfig([
    "--component",
    "hero-banner",
    "--viewport",
    "mobile",
  ]);
  const result = await runPageBuilderVisualFixtureCapture(config, {
    capture: async () => {
      calls.push("capture");
      return {
        baseUrl: config.capture.baseUrl,
        browserPath: "chrome",
        outputDir: config.capture.outputDir,
        screenshots: [],
      };
    },
    fetch: async () => ({ status: 200 }),
    runCommand: async (args) => {
      calls.push(`build:${args.join(" ")}`);
    },
    startServer: () => {
      calls.push("start");
      return server;
    },
    stopServer: async (child) => {
      assert.equal(child, server);
      calls.push("stop");
    },
  });

  assert.deepEqual(calls, [
    "build:--filter @app-starter/web build",
    "start",
    "capture",
    "stop",
  ]);
  assert.equal(result.buildSkipped, false);
  assert.equal(result.webPort, 3000);
});

test("visual fixture capture can skip build and still stops on failure", async () => {
  const calls = [];
  const config = readPageBuilderVisualFixtureCaptureCliConfig([
    "--skip-build",
    "--component",
    "hero-banner",
    "--viewport",
    "mobile",
  ]);

  await assert.rejects(
    () =>
      runPageBuilderVisualFixtureCapture(config, {
        capture: async () => {
          calls.push("capture");
          throw new Error("capture failed");
        },
        fetch: async () => ({ status: 200 }),
        runCommand: async () => calls.push("build"),
        startServer: () => {
          calls.push("start");
          return { exitCode: null };
        },
        stopServer: async () => calls.push("stop"),
      }),
    /capture failed/,
  );

  assert.deepEqual(calls, ["start", "capture", "stop"]);
});

test("visual fixture capture process wait resolves successful exits", async () => {
  const child = new EventEmitter();
  child.kill = () => {};

  queueMicrotask(() => child.emit("exit", 0, null));

  await waitForPageBuilderVisualProcessExit(child, {
    label: "test process",
  });
});

test("visual fixture capture starts pnpm with platform-compatible options", () => {
  const child = new EventEmitter();
  let call;

  createPageBuilderVisualPnpmProcess(["--version"], {
    cwd: "D:/repo",
    env: {},
    spawnProcess: (command, args, options) => {
      call = { args, command, options };
      return child;
    },
    stdio: "ignore",
  });

  if (process.platform === "win32") {
    assert.equal(call.command, "cmd.exe");
    assert.deepEqual(call.args, ["/d", "/s", "/c", "pnpm", "--version"]);
  } else {
    assert.equal(call.command, "pnpm");
    assert.deepEqual(call.args, ["--version"]);
  }

  assert.equal(call.options.shell, false);
  assert.equal(call.options.windowsHide, true);
});

test("visual fixture capture can invoke pnpm through the active package manager", () => {
  assert.deepEqual(readPnpmInvocation({ npm_execpath: "C:/pnpm/bin/pnpm.cjs" }), {
    args: ["C:/pnpm/bin/pnpm.cjs"],
    command: process.execPath,
    shell: false,
  });
});

test("visual fixture capture starts Next directly for a controllable server", () => {
  const child = new EventEmitter();
  let call;

  startPageBuilderVisualFixtureServer(
    { webPort: 3010 },
    {
      env: { EXISTING: "1" },
      nextCliPath: "fixtures/next",
      spawnProcess: (command, args, options) => {
        call = { args, command, options };
        return child;
      },
      webCwd: "apps/web",
    },
  );

  assert.equal(call.command, process.execPath);
  assert.deepEqual(call.args.slice(1), ["start", "--port", "3010"]);
  assert.match(call.args[0], /fixtures[\\/]next$/);
  assert.match(call.options.cwd, /apps[\\/]web$/);
  assert.equal(call.options.env.ENABLE_VISUAL_ACCEPTANCE_FIXTURE, "true");
  assert.equal(call.options.shell, false);
});

test("visual fixture capture explains server startup failures", () => {
  assert.throws(
    () =>
      startPageBuilderVisualFixtureServer(
        { webPort: 3010 },
        {
          spawnProcess: () => {
            throw new Error("spawn EPERM");
          },
        },
      ),
    /Page Builder visual fixture server failed to start: spawn EPERM\./,
  );
});

test("visual fixture capture report summarizes build and capture output", () => {
  const lines = formatPageBuilderVisualFixtureCaptureReport({
    baseUrl: "http://localhost:3000",
    browserPath: "chrome",
    buildSkipped: true,
    outputDir: "artifacts/visual",
    screenshots: [
      {
        bytes: 123,
        component: "hero-banner",
        evidencePath: "artifacts/visual/hero.png",
        viewport: "desktop",
      },
    ],
    webPort: 3000,
  });

  assert.match(lines.join("\n"), /Build: skipped/);
  assert.match(lines.join("\n"), /Web port: 3000/);
  assert.match(lines.join("\n"), /hero-banner\.desktop/);
});
