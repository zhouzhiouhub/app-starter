import {
  writeProductionSmokeDispatchInputsText,
} from "./production-smoke-dispatch-inputs-output.mjs";
import {
  writeProductionSmokeDispatchInputsTable,
} from "./production-smoke-dispatch-inputs-table-output.mjs";
import {
  writeProductionSmokeDispatchInputsManifest,
} from "./production-smoke-dispatch-inputs-manifest-output.mjs";
import {
  writeProductionSmokeRequestMarkdown,
} from "./production-smoke-request-markdown.mjs";

export async function writeProductionSmokeRequestOutputs(config, artifact) {
  await writeProductionSmokeRequestMarkdown(config.outputPath, artifact.request);

  if (config.inputsOutputPath) {
    await writeProductionSmokeDispatchInputsText(
      config.inputsOutputPath,
      artifact.dispatch,
    );
  }

  if (config.inputsTableOutputPath) {
    await writeProductionSmokeDispatchInputsTable(
      config.inputsTableOutputPath,
      artifact.dispatch,
    );
  }

  if (config.inputsJsonOutputPath) {
    await writeProductionSmokeDispatchInputsManifest(
      config.inputsJsonOutputPath,
      artifact.dispatch,
    );
  }
}

export function printProductionSmokeRequestSummary(config, artifact, writeLine) {
  writeLine(`Production smoke request written: ${config.outputPath}`);

  if (config.inputsOutputPath) {
    writeLine(
      `Production smoke dispatch inputs written: ${config.inputsOutputPath}`,
    );
  }

  if (config.inputsTableOutputPath) {
    writeLine(
      `Production smoke dispatch inputs table written: ${config.inputsTableOutputPath}`,
    );
  }

  if (config.inputsJsonOutputPath) {
    writeLine(
      `Production smoke dispatch inputs JSON written: ${config.inputsJsonOutputPath}`,
    );
  }

  writeLine(`Ready to dispatch: ${artifact.readyToDispatch ? "yes" : "no"}`);

  if (artifact.missingInputs.length > 0) {
    writeLine(`Missing inputs: ${artifact.missingInputs.join(", ")}`);
  }
}
