import { setTimeout as delay } from "node:timers/promises";
import {
  assertPageBuilderVisualFixtureAvailable,
  runPageBuilderVisualCapture,
} from "./page-builder-visual-capture.mjs";
import {
  runPageBuilderVisualPnpmCommand,
  startPageBuilderVisualFixtureServer,
  stopPageBuilderVisualFixtureServer,
} from "./page-builder-visual-fixture-capture-process.mjs";

const fixturePollMs = 500;

export async function runPageBuilderVisualFixtureCapture(config, input = {}) {
  const runCommand = input.runCommand ?? runPageBuilderVisualPnpmCommand;
  const startServer = input.startServer ?? startPageBuilderVisualFixtureServer;
  const stopServer = input.stopServer ?? stopPageBuilderVisualFixtureServer;
  const capture = input.capture ?? runPageBuilderVisualCapture;

  if (!config.skipBuild) {
    await runCommand(["--filter", "@app-starter/web", "build"], input);
  }

  const server = startServer(config, input);

  try {
    await waitForPageBuilderVisualFixture(config, { ...input, server });
    const result = await capture(config.capture, input.captureInput ?? input);

    return {
      ...result,
      buildSkipped: config.skipBuild,
      startTimeoutMs: config.startTimeoutMs,
      webPort: config.webPort,
    };
  } finally {
    await stopServer(server, input);
  }
}

export async function waitForPageBuilderVisualFixture(config, input = {}) {
  const deadline = Date.now() + config.startTimeoutMs;

  while (Date.now() < deadline) {
    assertServerStillRunning(input.server);

    try {
      await assertPageBuilderVisualFixtureAvailable(config.capture, input);
      return;
    } catch (error) {
      if (Date.now() >= deadline) {
        throw error;
      }
    }

    await delay(input.pollMs ?? fixturePollMs);
  }

  throw new Error("Timed out waiting for the Page Builder visual fixture.");
}

function assertServerStillRunning(server) {
  if (!server) {
    return;
  }

  if (server.exitCode !== null && server.exitCode !== undefined) {
    throw new Error(
      `Page Builder visual fixture server exited early with code ${server.exitCode}.`,
    );
  }
}
