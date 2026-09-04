#!/usr/bin/env node

import { pathToFileURL } from "node:url";
import { readErrorMessage } from "./smoke/smoke-error-message.mjs";
import {
  formatPageBuilderVisualDesignReferenceFreezeUsage,
  readPageBuilderVisualDesignReferenceFreezeCliConfig,
} from "./visual/page-builder-visual-design-reference-freeze-config.mjs";
import {
  formatPageBuilderVisualDesignReferenceFreezeReport,
  freezePageBuilderVisualDesignReferences,
} from "./visual/page-builder-visual-design-reference-freeze.mjs";

export function runPageBuilderVisualDesignReferenceFreezeCli(args, input = {}) {
  const stdout = input.stdout ?? console.log;
  const stderr = input.stderr ?? console.error;

  if (args.includes("--help") || args.includes("-h")) {
    for (const line of formatPageBuilderVisualDesignReferenceFreezeUsage()) {
      stdout(line);
    }
    return 0;
  }

  try {
    const config = readPageBuilderVisualDesignReferenceFreezeCliConfig(args);

    if (config.help) {
      for (const line of formatPageBuilderVisualDesignReferenceFreezeUsage()) {
        stdout(line);
      }
      return 0;
    }

    const result = freezePageBuilderVisualDesignReferences(config, input);

    for (const line of formatPageBuilderVisualDesignReferenceFreezeReport(result)) {
      stdout(line);
    }

    return 0;
  } catch (error) {
    stderr(readErrorMessage(error));
    return 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = runPageBuilderVisualDesignReferenceFreezeCli(
    process.argv.slice(2),
  );
}
