import {
  defaultPageBuilderVisualReferenceSourceDir,
  mvpPageBuilderComponents,
  pageBuilderVisualAcceptanceViewports,
} from "./page-builder-visual-acceptance-constants.mjs";

export const defaultPageBuilderVisualDesignReferenceFixtureDir =
  "reports/visual/page-builder-fixture";

export function readPageBuilderVisualDesignReferenceFreezeCliConfig(argv) {
  const args = stripPnpmSeparator(argv);
  const input = {
    outputDir: defaultPageBuilderVisualReferenceSourceDir,
    sourceDir: defaultPageBuilderVisualDesignReferenceFixtureDir,
  };

  for (let index = 0; index < args.length; index += 1) {
    const option = args[index];

    if (option === "--help" || option === "-h") {
      return { help: true };
    }

    if (option === "--source-dir") {
      input.sourceDir = readOptionValue(option, args, index);
      index += 1;
      continue;
    }

    if (option === "--output-dir") {
      input.outputDir = readOptionValue(option, args, index);
      index += 1;
      continue;
    }

    throw new Error(`Unknown design reference freeze option: ${option}`);
  }

  return {
    components: mvpPageBuilderComponents,
    outputDir: readDirectoryOption(input.outputDir, "output"),
    sourceDir: readDirectoryOption(input.sourceDir, "source"),
    viewports: pageBuilderVisualAcceptanceViewports,
  };
}

export function formatPageBuilderVisualDesignReferenceFreezeUsage() {
  return [
    "Usage:",
    "  pnpm visual:references:freeze",
    "  pnpm visual:references:freeze -- --source-dir reports/visual/page-builder-fixture",
    "",
    "Options:",
    "  --source-dir <path>  Fixture screenshot directory.",
    "  --output-dir <path>  Design reference PNG directory.",
  ];
}

function readOptionValue(option, args, index) {
  const value = args[index + 1];

  if (!value || value.startsWith("--")) {
    throw new Error(`${option} requires a value.`);
  }

  return value;
}

function readDirectoryOption(value, label) {
  if (typeof value !== "string" || value.trim() !== value || !value) {
    throw new Error(`Design reference freeze ${label} directory must not be empty or padded.`);
  }

  if (value.includes("\\") || value.includes("\0") || value.startsWith("/")) {
    throw new Error(`Design reference freeze ${label} directory must be a relative POSIX path.`);
  }

  return value;
}

function stripPnpmSeparator(argv) {
  return argv[0] === "--" ? argv.slice(1) : argv;
}
