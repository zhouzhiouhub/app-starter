import {
  readCaptureBaseUrl,
  readPageBuilderVisualCaptureCliConfig,
} from "./page-builder-visual-capture-config.mjs";

const localFixtureHosts = new Set(["127.0.0.1", "::1", "localhost"]);
const startTimeoutBounds = { max: 120000, min: 1000 };
const defaultStartTimeoutMs = 60000;

export function readPageBuilderVisualFixtureCaptureCliConfig(
  argv,
  env = process.env,
) {
  const args = stripPnpmSeparator(argv);
  const captureArgs = [];
  const fixtureInput = {
    skipBuild: false,
    startTimeoutMs: env.PAGE_BUILDER_VISUAL_START_TIMEOUT_MS,
  };

  for (let index = 0; index < args.length; index += 1) {
    const option = args[index];

    if (option === "--help" || option === "-h") {
      return { help: true };
    }

    if (option === "--skip-build") {
      fixtureInput.skipBuild = true;
      continue;
    }

    if (option === "--start-timeout-ms") {
      fixtureInput.startTimeoutMs = readOptionValue(option, args, index);
      index += 1;
      continue;
    }

    if (option === "--write-manifest") {
      captureArgs.push(option);
      continue;
    }

    captureArgs.push(option);

    if (option.startsWith("--")) {
      captureArgs.push(readOptionValue(option, args, index));
      index += 1;
    }
  }

  const capture = readPageBuilderVisualCaptureCliConfig(captureArgs, env);

  return {
    capture,
    skipBuild: fixtureInput.skipBuild,
    startTimeoutMs: readStartTimeoutMs(fixtureInput.startTimeoutMs),
    webPort: readLocalFixturePort(capture.baseUrl),
  };
}

export function readLocalFixturePort(baseUrl) {
  const normalized = readCaptureBaseUrl(baseUrl);
  const url = new URL(normalized);

  if (url.protocol !== "http:") {
    throw new Error("Fixture capture must use a local http Web URL.");
  }

  if (!localFixtureHosts.has(url.hostname)) {
    throw new Error("Fixture capture base URL must target localhost or loopback.");
  }

  if (!url.port) {
    throw new Error("Fixture capture base URL must include an explicit port.");
  }

  return Number(url.port);
}

function readStartTimeoutMs(value) {
  const raw = value ?? String(defaultStartTimeoutMs);
  const timeout = Number(raw);

  if (
    !Number.isInteger(timeout) ||
    timeout < startTimeoutBounds.min ||
    timeout > startTimeoutBounds.max
  ) {
    throw new Error(
      `Fixture capture start timeout must be an integer from ${startTimeoutBounds.min} to ${startTimeoutBounds.max} ms.`,
    );
  }

  return timeout;
}

function readOptionValue(option, args, index) {
  const value = args[index + 1];

  if (!value || value.startsWith("--")) {
    throw new Error(`${option} requires a value.`);
  }

  return value;
}

function stripPnpmSeparator(argv) {
  return argv[0] === "--" ? argv.slice(1) : argv;
}
