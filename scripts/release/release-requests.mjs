import { runPageBuilderVisualReferenceRequestCli } from "../page-builder-visual-reference-request.mjs";
import { runProductionSmokeRequestCli } from "../smoke/production-smoke-request.mjs";
import { readErrorMessage } from "../smoke/smoke-error-message.mjs";
import { runReleaseEvidenceRequestCli } from "./release-evidence-request.mjs";
import { readReleaseRequestsCliConfig } from "./release-requests-cli-config.mjs";
import { printReleaseRequestsHelp } from "./release-requests-help.mjs";
import { printReleaseRequestFiles } from "./release-requests-summary.mjs";

export { readReleaseRequestsCliConfig } from "./release-requests-cli-config.mjs";
export {
  createReleaseRequestsCommand,
  createReleaseRequestsOutputSummary,
  defaultReleaseRequestsOutputPaths,
} from "./release-requests-config.mjs";

export async function runReleaseRequestsCli(args = [], input = {}) {
  const stdout = input.stdout ?? console.log;
  const stderr = input.stderr ?? console.error;

  if (args.includes("--help") || args.includes("-h")) {
    printReleaseRequestsHelp(stdout);
    return 0;
  }

  try {
    const config = readReleaseRequestsCliConfig(args);

    stdout("Release evidence request bundle");
    const releaseExit = await runReleaseEvidenceRequestCli(
      config.releaseEvidenceArgs,
      input,
    );
    if (releaseExit !== 0) {
      return releaseExit;
    }

    const visualExit = await runPageBuilderVisualReferenceRequestCli(
      config.visualReferenceArgs,
      input,
    );
    if (visualExit !== 0) {
      return visualExit;
    }

    const smokeExit = await runProductionSmokeRequestCli(
      config.productionSmokeArgs,
      input,
    );
    if (smokeExit !== 0) {
      return smokeExit;
    }

    printReleaseRequestFiles(config.outputPaths, stdout);
    return 0;
  } catch (error) {
    stderr(`Release requests failed: ${readErrorMessage(error)}`);
    return 1;
  }
}
