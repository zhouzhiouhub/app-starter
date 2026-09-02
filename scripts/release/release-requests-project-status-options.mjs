import {
  normalizeProjectStatusMarkdownPath,
  normalizeProjectStatusPath,
} from "./release-notes-validation.mjs";
import {
  readOptionValue,
  setValueOption,
} from "./release-cli-options.mjs";

export function readProjectStatusOutputOption(
  config,
  option,
  args,
  index,
  value,
) {
  if (option === "--project-status-output") {
    const outputPath = normalizeProjectStatusPath(
      readOptionValue(option, args, index, value),
    );
    setValueOption(
      config.releaseEvidenceArgs,
      "--project-status-output",
      outputPath,
    );
    config.outputPaths.projectStatus = outputPath;
    return true;
  }

  if (option === "--project-status-markdown") {
    const outputPath = normalizeProjectStatusMarkdownPath(
      readOptionValue(option, args, index, value),
    );
    setValueOption(
      config.releaseEvidenceArgs,
      "--project-status-markdown",
      outputPath,
    );
    config.outputPaths.projectStatusMarkdown = outputPath;
    return true;
  }

  return false;
}
