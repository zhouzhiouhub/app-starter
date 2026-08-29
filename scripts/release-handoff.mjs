#!/usr/bin/env node

import { pathToFileURL } from "node:url";
import {
  runReleaseHandoffCli,
  printReleaseHandoffHelp,
} from "./release/release-handoff.mjs";

export { runReleaseHandoffCli } from "./release/release-handoff.mjs";

function isMainModule() {
  return (
    process.argv[1] &&
    import.meta.url === pathToFileURL(process.argv[1]).href
  );
}

if (isMainModule()) {
  process.exitCode = await runReleaseHandoffCli(process.argv.slice(2), {
    printHelp: printReleaseHandoffHelp,
  });
}
