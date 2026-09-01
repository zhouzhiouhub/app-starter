#!/usr/bin/env node

import { pathToFileURL } from "node:url";
import { runReleaseEvidenceRequestCli } from "./release/release-evidence-request.mjs";

function isMainModule() {
  return (
    process.argv[1] &&
    import.meta.url === pathToFileURL(process.argv[1]).href
  );
}

if (isMainModule()) {
  process.exitCode = await runReleaseEvidenceRequestCli(process.argv.slice(2));
}
