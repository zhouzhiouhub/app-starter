import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { runPageBuilderVisualCapture } from "./page-builder-visual-capture.mjs";

test("visual capture reports bounded browser output on screenshot failures", async () => {
  const child = createBrowserChild();

  await assert.rejects(
    () =>
      runCaptureWithSpawn(() => {
        queueMicrotask(() => {
          child.stderr.emit(
            "data",
            Buffer.from("Missing X server\u0007\nTry --no-sandbox."),
          );
          child.emit("exit", 1, null);
        });
        return child;
      }),
    /Browser output: Missing X server Try --no-sandbox\./,
  );
});

test("visual capture truncates verbose browser output", async () => {
  const child = createBrowserChild();

  await assert.rejects(
    () =>
      runCaptureWithSpawn(() => {
        queueMicrotask(() => {
          child.stderr.emit(
            "data",
            Buffer.from(`${"browser-log ".repeat(160)}tail-marker`),
          );
          child.emit("exit", 1, null);
        });
        return child;
      }),
    (error) => {
      assert.match(error.message, /\[truncated\]/);
      assert.doesNotMatch(error.message, /tail-marker/);
      assert.ok(error.message.length < 1400);
      return true;
    },
  );
});

test("visual capture explains browser process startup failures", async () => {
  const child = createBrowserChild();

  await assert.rejects(
    () =>
      runCaptureWithSpawn(() => {
        queueMicrotask(() => {
          child.emit("error", new Error("spawn EPERM"));
        });
        return child;
      }),
    /Browser screenshot process failed: spawn EPERM\. No browser output was captured\./,
  );
});

test("visual capture explains synchronous browser spawn failures", async () => {
  await assert.rejects(
    () =>
      runCaptureWithSpawn(() => {
        throw new Error("spawn EPERM");
      }),
    /Browser screenshot process failed: spawn EPERM\. No browser output was captured\./,
  );
});

function runCaptureWithSpawn(spawn) {
  return runPageBuilderVisualCapture(
    {
      baseUrl: "http://localhost:3000",
      browserPath: "chrome",
      components: ["hero-banner"],
      outputDir: mkdtempSync(path.join(tmpdir(), "visual-capture-failure-")),
      timeoutMs: 2000,
      viewports: ["desktop"],
    },
    {
      fetch: async () => ({ status: 200 }),
      screenshotInput: { pollMs: 1 },
      spawn,
    },
  );
}

function createBrowserChild() {
  const child = new EventEmitter();
  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
  child.killed = false;
  child.kill = () => {
    child.killed = true;
  };
  return child;
}
