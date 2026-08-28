import { spawn } from "node:child_process";
import path from "node:path";

const fixtureProcessExitTimeoutMs = 5000;
const nextCliPath = "apps/web/node_modules/next/dist/bin/next";

export function createPageBuilderVisualPnpmProcess(args, input = {}) {
  const invocation = readPnpmInvocation(input.env ?? process.env);

  try {
    return (input.spawnProcess ?? spawn)(invocation.command, [
      ...invocation.args,
      ...args,
    ], {
      cwd: input.cwd ?? process.cwd(),
      env: input.env ?? process.env,
      shell: invocation.shell,
      stdio: input.stdio ?? "inherit",
      windowsHide: true,
    });
  } catch (error) {
    throw new Error(
      `pnpm ${args.join(" ")} failed to start: ${formatProcessError(error)}`,
    );
  }
}

export function runPageBuilderVisualPnpmCommand(args, input = {}) {
  return waitForPageBuilderVisualProcessExit(
    createPageBuilderVisualPnpmProcess(args, input),
    { label: `pnpm ${args.join(" ")}` },
  );
}

export function startPageBuilderVisualFixtureServer(config, input = {}) {
  try {
    return (input.spawnProcess ?? spawn)(
      process.execPath,
      [
        path.resolve(input.nextCliPath ?? nextCliPath),
        "start",
        "--port",
        String(config.webPort),
      ],
      {
        cwd: path.resolve(input.webCwd ?? "apps/web"),
        env: {
          ...process.env,
          ...input.env,
          ENABLE_VISUAL_ACCEPTANCE_FIXTURE: "true",
        },
        shell: false,
        stdio: input.serverStdio ?? "ignore",
        windowsHide: true,
      },
    );
  } catch (error) {
    throw new Error(
      `Page Builder visual fixture server failed to start: ${formatProcessError(
        error,
      )}`,
    );
  }
}

export async function stopPageBuilderVisualFixtureServer(child, input = {}) {
  if (!child || child.exitCode !== null || child.killed) {
    return;
  }

  child.kill();

  await waitForPageBuilderVisualProcessExit(child, {
    allowSignal: true,
    label: "Page Builder visual fixture server",
    timeoutMs: input.timeoutMs ?? fixtureProcessExitTimeoutMs,
  });
}

export function waitForPageBuilderVisualProcessExit(child, input = {}) {
  const timeoutMs = input.timeoutMs ?? 0;

  return new Promise((resolve, reject) => {
    const timer =
      timeoutMs > 0
        ? setTimeout(() => {
            child.kill();
            reject(new Error(`${input.label} did not exit before timeout.`));
          }, timeoutMs)
        : null;

    child.once("error", (error) => {
      clearOptionalTimeout(timer);
      reject(error);
    });

    child.once("exit", (code, signal) => {
      clearOptionalTimeout(timer);

      if (code && code !== 0) {
        reject(new Error(`${input.label} failed with exit code ${code}.`));
        return;
      }

      if (!input.allowSignal && signal) {
        reject(new Error(`${input.label} exited with signal ${signal}.`));
        return;
      }

      resolve();
    });
  });
}

export function readPnpmInvocation(env = process.env) {
  if (env.npm_execpath) {
    return {
      args: [env.npm_execpath],
      command: process.execPath,
      shell: false,
    };
  }

  return {
    args: process.platform === "win32" ? ["/d", "/s", "/c", "pnpm"] : [],
    command: process.platform === "win32" ? env.ComSpec ?? "cmd.exe" : "pnpm",
    shell: false,
  };
}

function clearOptionalTimeout(timer) {
  if (timer) {
    clearTimeout(timer);
  }
}

function formatProcessError(error) {
  const message =
    error instanceof Error && error.message ? error.message.trim() : String(error);

  return /[.!?]$/u.test(message) ? message : `${message}.`;
}
