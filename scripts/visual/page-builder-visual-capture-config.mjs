import path from "node:path";
import {
  pageBuilderVisualCaptureComponents,
  pageBuilderVisualCaptureDefaultBaseUrl,
  pageBuilderVisualCaptureDefaultOutputDir,
  pageBuilderVisualCaptureDefaultTimeoutMs,
  pageBuilderVisualCaptureViewports,
} from "./page-builder-visual-capture-constants.mjs";
import { readCaptureManifestPath } from "./page-builder-visual-capture-manifest.mjs";

const captureBrowserEnvNames = [
  "PAGE_BUILDER_VISUAL_BROWSER",
  "CHROME_PATH",
];
const captureOutputRoots = ["artifacts/visual", "reports/visual"];
const unsafeOutputDirCharacters = new Set([":", "<", ">", '"', "'", "`"]);
const timeoutBounds = { max: 120000, min: 1000 };

export function readPageBuilderVisualCaptureCliConfig(
  argv,
  env = process.env,
) {
  const args = stripPnpmSeparator(argv);
  const input = {
    baseUrl: env.PAGE_BUILDER_VISUAL_BASE_URL,
    browserPath: readEnvBrowserPath(env),
    components: [],
    manifestPath: env.PAGE_BUILDER_VISUAL_MANIFEST_PATH,
    outputDir: env.PAGE_BUILDER_VISUAL_OUTPUT_DIR,
    timeoutMs: env.PAGE_BUILDER_VISUAL_TIMEOUT_MS,
    viewports: [],
    writeManifest: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const option = args[index];

    if (option === "--help" || option === "-h") {
      return { help: true };
    }

    index = readCaptureOption(option, args, index, input);
  }

  return normalizeCaptureConfig(input);
}

export function normalizeCaptureConfig(input) {
  return {
    baseUrl: readCaptureBaseUrl(input.baseUrl),
    browserPath: input.browserPath,
    components: readCaptureComponents(input.components),
    manifestPath: readCaptureManifestPath(input.manifestPath),
    outputDir: readCaptureOutputDir(input.outputDir),
    timeoutMs: readCaptureTimeoutMs(input.timeoutMs),
    viewports: readCaptureViewports(input.viewports),
    writeManifest: Boolean(input.writeManifest),
  };
}

export function readCaptureBaseUrl(value) {
  const raw = value ?? pageBuilderVisualCaptureDefaultBaseUrl;

  if (typeof raw !== "string" || raw.trim() !== raw || !raw) {
    throw new Error("Visual capture base URL must not be empty or padded.");
  }

  let url;

  try {
    url = new URL(raw);
  } catch {
    throw new Error(`Invalid visual capture base URL: ${raw}`);
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Visual capture base URL must use http or https.");
  }

  if (url.username || url.password || url.search || url.hash) {
    throw new Error(
      "Visual capture base URL must not include credentials, query, or fragment.",
    );
  }

  return url.origin;
}

export function readCaptureOutputDir(value) {
  const raw = value ?? pageBuilderVisualCaptureDefaultOutputDir;

  if (typeof raw !== "string" || raw.trim() !== raw || !raw) {
    throw new Error("Visual capture output directory must not be empty or padded.");
  }

  if (path.isAbsolute(raw) || path.win32.isAbsolute(raw) || hasProtocol(raw)) {
    throw new Error("Visual capture output directory must be repository-relative.");
  }

  if (hasUnsafeOutputDirCharacter(raw)) {
    throw new Error("Visual capture output directory has unsafe characters.");
  }

  const normalized = raw.replaceAll("\\", "/").replace(/\/+$/u, "");
  const segments = normalized.split("/");

  if (
    normalized.startsWith(".") ||
    segments.some((segment) => !segment || segment === "." || segment === "..")
  ) {
    throw new Error("Visual capture output directory has unsafe path segments.");
  }

  if (!captureOutputRoots.some((root) => isPathUnderRoot(normalized, root))) {
    throw new Error(
      `Visual capture output directory must live under ${captureOutputRoots.join(
        " or ",
      )}.`,
    );
  }

  return normalized;
}

function readCaptureOption(option, args, index, input) {
  switch (option) {
    case "--base-url":
      input.baseUrl = readOptionValue(option, args, index);
      return index + 1;
    case "--browser":
      input.browserPath = readOptionValue(option, args, index);
      return index + 1;
    case "--component":
      input.components.push(...readCommaList(readOptionValue(option, args, index)));
      return index + 1;
    case "--manifest":
      input.manifestPath = readOptionValue(option, args, index);
      return index + 1;
    case "--output-dir":
      input.outputDir = readOptionValue(option, args, index);
      return index + 1;
    case "--timeout-ms":
      input.timeoutMs = readOptionValue(option, args, index);
      return index + 1;
    case "--viewport":
      input.viewports.push(...readCommaList(readOptionValue(option, args, index)));
      return index + 1;
    case "--write-manifest":
      input.writeManifest = true;
      return index;
    default:
      throw new Error(`Unknown visual capture option: ${option}`);
  }
}

function readOptionValue(option, args, index) {
  const value = args[index + 1];

  if (!value || value.startsWith("--")) {
    throw new Error(`${option} requires a value.`);
  }

  return value;
}

function normalizeOrderedSubset(values, allowed, label) {
  if (!values || values.length === 0) {
    return [...allowed];
  }

  const normalized = [];

  for (const value of values) {
    if (!allowed.includes(value)) {
      throw new Error(
        `Unknown visual capture ${label}: ${value}. Expected ${allowed.join(
          ", ",
        )}.`,
      );
    }

    if (!normalized.includes(value)) {
      normalized.push(value);
    }
  }

  return normalized;
}

function readCaptureComponents(values) {
  return normalizeOrderedSubset(
    values,
    pageBuilderVisualCaptureComponents,
    "component",
  );
}

function readCaptureViewports(values) {
  return normalizeOrderedSubset(
    values,
    pageBuilderVisualCaptureViewports,
    "viewport",
  );
}

function readCaptureTimeoutMs(value) {
  const raw = value ?? String(pageBuilderVisualCaptureDefaultTimeoutMs);
  const timeout = Number(raw);

  if (
    !Number.isInteger(timeout) ||
    timeout < timeoutBounds.min ||
    timeout > timeoutBounds.max
  ) {
    throw new Error(
      `Visual capture timeout must be an integer from ${timeoutBounds.min} to ${timeoutBounds.max} ms.`,
    );
  }

  return timeout;
}

function readCommaList(value) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function readEnvBrowserPath(env) {
  for (const name of captureBrowserEnvNames) {
    if (env[name]) {
      return env[name];
    }
  }

  return undefined;
}

function stripPnpmSeparator(argv) {
  return argv[0] === "--" ? argv.slice(1) : argv;
}

function hasProtocol(value) {
  return /^[a-z][a-z0-9+.-]*:/iu.test(value);
}

function hasUnsafeOutputDirCharacter(value) {
  for (const character of value) {
    if (character < " " || unsafeOutputDirCharacters.has(character)) {
      return true;
    }
  }

  return false;
}

function isPathUnderRoot(value, root) {
  return value === root || value.startsWith(`${root}/`);
}
