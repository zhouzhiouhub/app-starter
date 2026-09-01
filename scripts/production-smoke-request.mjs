#!/usr/bin/env node

import { pathToFileURL } from "node:url";
import { runProductionSmokeRequestCli } from "./smoke/production-smoke-request.mjs";

function isMainModule() {
  return (
    process.argv[1] &&
    import.meta.url === pathToFileURL(process.argv[1]).href
  );
}

if (isMainModule()) {
  process.exitCode = await runProductionSmokeRequestCli(process.argv.slice(2));
}
