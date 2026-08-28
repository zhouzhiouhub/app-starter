import {
  defaultPageBuilderVisualAcceptanceManifestPath,
  mvpPageBuilderComponents,
  pageBuilderVisualAcceptanceViewports,
} from "./page-builder-visual-acceptance.mjs";

export function readPageBuilderVisualMeasureCliConfig(argv) {
  const args = stripPnpmSeparator(argv);
  const input = {
    acceptPassing: false,
    components: [],
    manifestPath: defaultPageBuilderVisualAcceptanceManifestPath,
    requireComplete: false,
    viewports: [],
    write: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const option = args[index];

    if (option === "--help" || option === "-h") {
      return { help: true };
    }

    index = readMeasureOption(option, args, index, input);
  }

  return {
    acceptPassing: input.acceptPassing,
    components: readOrderedSubset(
      input.components,
      mvpPageBuilderComponents,
      "component",
    ),
    manifestPath: input.manifestPath,
    requireComplete: input.requireComplete,
    viewports: readOrderedSubset(
      input.viewports,
      pageBuilderVisualAcceptanceViewports,
      "viewport",
    ),
    write: input.write,
  };
}

function readMeasureOption(option, args, index, input) {
  switch (option) {
    case "--accept-passing":
      input.acceptPassing = true;
      input.write = true;
      return index;
    case "--component":
      input.components.push(...readCommaList(readOptionValue(option, args, index)));
      return index + 1;
    case "--manifest":
      input.manifestPath = readOptionValue(option, args, index);
      return index + 1;
    case "--require-complete":
      input.requireComplete = true;
      return index;
    case "--viewport":
      input.viewports.push(...readCommaList(readOptionValue(option, args, index)));
      return index + 1;
    case "--write":
      input.write = true;
      return index;
    default:
      throw new Error(`Unknown visual measure option: ${option}`);
  }
}

function readOptionValue(option, args, index) {
  const value = args[index + 1];

  if (!value || value.startsWith("--")) {
    throw new Error(`${option} requires a value.`);
  }

  return value;
}

function readOrderedSubset(values, allowed, label) {
  if (!values || values.length === 0) {
    return [...allowed];
  }

  const result = [];

  for (const value of values) {
    if (!allowed.includes(value)) {
      throw new Error(
        `Unknown visual measure ${label}: ${value}. Expected ${allowed.join(
          ", ",
        )}.`,
      );
    }

    if (!result.includes(value)) {
      result.push(value);
    }
  }

  return result;
}

function readCommaList(value) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function stripPnpmSeparator(argv) {
  return argv[0] === "--" ? argv.slice(1) : argv;
}
