#!/usr/bin/env node

import { pathToFileURL } from "node:url";
import { runReleaseRequestsCli } from "./release/release-requests.mjs";

function isMainModule() {
  return (
    process.argv[1] &&
    import.meta.url === pathToFileURL(process.argv[1]).href
  );
}

if (isMainModule()) {
  process.exitCode = await runReleaseRequestsCli(process.argv.slice(2));
}
