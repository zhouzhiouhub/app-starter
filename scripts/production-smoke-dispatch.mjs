#!/usr/bin/env node

import { pathToFileURL } from "node:url";
import { runProductionSmokeDispatchCli } from "./smoke/production-smoke-dispatch-cli.mjs";

function isMainModule() {
  return (
    process.argv[1] &&
    import.meta.url === pathToFileURL(process.argv[1]).href
  );
}

if (isMainModule()) {
  process.exitCode = await runProductionSmokeDispatchCli(
    process.argv.slice(2),
  );
}
